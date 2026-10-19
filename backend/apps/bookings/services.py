from datetime import datetime, date, time, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.bookings.models import Availability, Booking
from apps.services.models import Service
from apps.accounts.models import ProviderProfile

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
    try:
        service = Service.objects.select_related('provider').get(id=service_id, is_active=True)
    except Service.DoesNotExist:
        raise ValidationError('Service was not found or is no longer active.')
    # Lock the provider row, not just existing bookings. This serializes all slot
    # allocation attempts for the same provider on databases supporting row locks.
    provider = ProviderProfile.objects.select_for_update().get(pk=service.provider_id)
    service.provider = provider

    # Parse inputs
    try:
        booking_date = datetime.strptime(booking_date_str, '%Y-%m-%d').date() if isinstance(booking_date_str, str) else booking_date_str
        parsed_time = datetime.strptime(start_time_str, '%H:%M').time() if isinstance(start_time_str, str) else start_time_str
    except (TypeError, ValueError):
        raise ValidationError('Invalid booking date or time. Use YYYY-MM-DD and HH:MM.')

    start_dt = datetime.combine(booking_date, parsed_time)
    now_local = timezone.localtime(timezone.now()).replace(tzinfo=None)
    if start_dt <= now_local:
        raise ValidationError('Cannot book a time slot in the past.')
    end_dt = start_dt + timedelta(minutes=service.duration_minutes)
    if end_dt.date() != booking_date:
        raise ValidationError('A booking cannot extend past the end of the day.')
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
    except Availability.DoesNotExist:
        # Match the default schedule shown to customers in get_available_slots.
        if weekday < 5:
            schedule = Availability(provider=provider, day_of_week=weekday, start_time=time(9, 0), end_time=time(17, 0), is_available=True)
        elif weekday == 5:
            schedule = Availability(provider=provider, day_of_week=weekday, start_time=time(10, 0), end_time=time(14, 0), is_available=True)
        else:
            schedule = Availability(provider=provider, day_of_week=weekday, is_available=False)
    if not schedule.is_available:
        raise ValidationError('The provider is not operating on this day.')
    if parsed_time < schedule.start_time or end_time > schedule.end_time:
        raise ValidationError(f"The requested time is outside the provider's working hours ({schedule.start_time.strftime('%H:%M')} - {schedule.end_time.strftime('%H:%M')}).")

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
    # Use the same lock order as new bookings (provider first, booking second)
    # to reduce deadlock risk when reschedules race with new booking requests.
    ProviderProfile.objects.select_for_update().get(pk=booking.provider_id)
    booking = Booking.objects.select_for_update().select_related('provider', 'service').get(pk=booking.pk)
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
    now_local = timezone.localtime(timezone.now()).replace(tzinfo=None)
    if start_dt <= now_local:
        raise ValidationError('Cannot reschedule to a past date or time.')
    end_dt = start_dt + timedelta(minutes=booking.service.duration_minutes)
    if end_dt.date() != new_date:
        raise ValidationError('A booking cannot extend past the end of the day.')
    new_end = end_dt.time()
    weekday = new_date.weekday()
    try:
        schedule = Availability.objects.get(provider=booking.provider, day_of_week=weekday)
    except Availability.DoesNotExist:
        if weekday < 5:
            schedule = Availability(provider=booking.provider, day_of_week=weekday, start_time=time(9, 0), end_time=time(17, 0), is_available=True)
        elif weekday == 5:
            schedule = Availability(provider=booking.provider, day_of_week=weekday, start_time=time(10, 0), end_time=time(14, 0), is_available=True)
        else:
            schedule = Availability(provider=booking.provider, day_of_week=weekday, is_available=False)
    if not schedule.is_available or new_start < schedule.start_time or new_end > schedule.end_time:
        raise ValidationError('The selected time is outside the provider working hours or the provider is unavailable.')

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
