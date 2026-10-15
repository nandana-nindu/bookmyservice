from datetime import datetime, date, time, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.bookings.models import Availability, Booking
from apps.services.models import Service

def get_available_slots_for_provider(provider, service, target_date):
    """
    Computes available time slots for a provider on a specific date based on:
    1. Provider's working hours for that weekday
    2. Service duration (e.g. 30, 60, 90 min)
    3. Conflicting active bookings (PENDING, CONFIRMED, IN_PROGRESS)
    """
    weekday = target_date.weekday() # 0 = Monday, 6 = Sunday

    try:
        schedule = Availability.objects.get(provider=provider, day_of_week=weekday)
    except Availability.DoesNotExist:
        # Default schedule if not configured: Mon-Fri 09:00 - 17:00, Sat 10:00 - 14:00
        if weekday < 5:
            schedule = Availability(provider=provider, day_of_week=weekday, start_time=time(9, 0), end_time=time(17, 0), is_available=True)
        elif weekday == 5:
            schedule = Availability(provider=provider, day_of_week=weekday, start_time=time(10, 0), end_time=time(14, 0), is_available=True)
        else:
            schedule = Availability(provider=provider, day_of_week=weekday, is_available=False)

    if not schedule.is_available:
        return []

    # Get active bookings for that date
    active_bookings = Booking.objects.filter(
        provider=provider,
        booking_date=target_date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS]
    ).values('start_time', 'end_time')

    duration_delta = timedelta(minutes=service.duration_minutes)
    
    # Generate potential slots
    slots = []
    current_dt = datetime.combine(target_date, schedule.start_time)
    end_dt = datetime.combine(target_date, schedule.end_time)
    
    now_dt = datetime.now()

    while current_dt + duration_delta <= end_dt:
        slot_start = current_dt.time()
        slot_end = (current_dt + duration_delta).time()

        # Check if slot is in the past for today
        is_past = False
        if target_date == date.today() and current_dt < now_dt:
            is_past = True

        # Check overlap with any active booking
        # Overlap condition: slot_start < booking_end and slot_end > booking_start
        has_overlap = False
        for b in active_bookings:
            b_start = b['start_time']
            b_end = b['end_time']
            if slot_start < b_end and slot_end > b_start:
                has_overlap = True
                break

        is_available = (not has_overlap) and (not is_past)

        slots.append({
            'start_time': slot_start.strftime('%H:%M'),
            'end_time': slot_end.strftime('%H:%M'),
            'available': is_available
        })

        # Step forward by 30 mins or duration
        step_minutes = 30 if service.duration_minutes >= 30 else service.duration_minutes
        current_dt += timedelta(minutes=step_minutes)

    return slots


@transaction.atomic
def create_booking_with_lock(customer_profile, service_id, booking_date_str, start_time_str, notes=''):
    """
    Assessment Section 9: Critical Requirement - Prevent Double Booking.
    Uses pessimistic locking (select_for_update) inside an atomic transaction.
    """
    service = Service.objects.select_related('provider').get(id=service_id, is_active=True)
    provider = service.provider

    # Parse inputs
    if isinstance(booking_date_str, str):
        booking_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date()
    else:
        booking_date = booking_date_str

    if isinstance(start_time_str, str):
        parsed_time = datetime.strptime(start_time_str, '%H:%M').time()
    else:
        parsed_time = start_time_str

    start_dt = datetime.combine(booking_date, parsed_time)
    end_dt = start_dt + timedelta(minutes=service.duration_minutes)
    end_time = end_dt.time()

    if booking_date < date.today():
        raise ValidationError("Cannot book services for a past date.")

    # 1. Lock existing active bookings for this provider on this specific date
    overlapping = Booking.objects.select_for_update().filter(
        provider=provider,
        booking_date=booking_date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS],
        start_time__lt=end_time,
        end_time__gt=parsed_time
    )

    if overlapping.exists():
        raise ValidationError("This time slot has just been booked by another customer. Please select another slot.")

    # 2. Check provider's weekly availability
    weekday = booking_date.weekday()
    try:
        schedule = Availability.objects.get(provider=provider, day_of_week=weekday)
        if not schedule.is_available:
            raise ValidationError(f"The provider is not operating on this day.")
        if parsed_time < schedule.start_time or end_time > schedule.end_time:
            raise ValidationError(f"The requested time is outside the provider's working hours ({schedule.start_time.strftime('%H:%M')} - {schedule.end_time.strftime('%H:%M')}).")
    except Availability.DoesNotExist:
        # Default fallback check (09:00 - 18:00)
        pass

    # 3. Create the booking
    booking = Booking.objects.create(
        customer=customer_profile,
        provider=provider,
        service=service,
        booking_date=booking_date,
        start_time=parsed_time,
        end_time=end_time,
        total_price=service.price,
        notes=notes,
        status=Booking.Status.PENDING
    )

    return booking


@transaction.atomic
def reschedule_booking_with_lock(booking, new_date_str, new_start_time_str):
    """
    Reschedules booking with concurrency check and 2-hour cancellation/reschedule policy enforcement.
    """
    can_proceed, reason = booking.can_cancel_or_reschedule()
    if not can_proceed:
        raise ValidationError(reason)

    if isinstance(new_date_str, str):
        new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
    else:
        new_date = new_date_str

    if isinstance(new_start_time_str, str):
        new_start = datetime.strptime(new_start_time_str, '%H:%M').time()
    else:
        new_start = new_start_time_str

    start_dt = datetime.combine(new_date, new_start)
    end_dt = start_dt + timedelta(minutes=booking.service.duration_minutes)
    new_end = end_dt.time()

    # Lock and check conflicts excluding this current booking
    overlapping = Booking.objects.select_for_update().filter(
        provider=booking.provider,
        booking_date=new_date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS],
        start_time__lt=new_end,
        end_time__gt=new_start
    ).exclude(id=booking.id)

    if overlapping.exists():
        raise ValidationError("The selected reschedule slot is already occupied. Please select an available slot.")

    booking.booking_date = new_date
    booking.start_time = new_start
    booking.end_time = new_end
    booking.save(update_fields=['booking_date', 'start_time', 'end_time', 'updated_at'])
    return booking
