from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date, time, timedelta, datetime
from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.services.models import Category, Service
from apps.bookings.models import Availability, Booking
from apps.bookings.services import create_booking_with_lock, get_available_slots_for_provider

class DoubleBookingPreventionTests(TestCase):
    def setUp(self):
        # 1. Setup Provider
        self.provider_user = User.objects.create_user(
            email='provider.test@example.com',
            password='password123',
            name='Test Provider',
            role=User.Role.PROVIDER
        )
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            business_name='Fast Fix Co',
            location='Kochi'
        )

        # Provider schedule: Available 09:00 - 17:00 every day
        for d in range(7):
            Availability.objects.create(
                provider=self.provider_profile,
                day_of_week=d,
                start_time=time(9, 0),
                end_time=time(17, 0),
                is_available=True
            )

        # 2. Setup Category & Service (60 mins)
        self.category = Category.objects.create(name='Tech Support', slug='tech-support')
        self.service = Service.objects.create(
            provider=self.provider_profile,
            category=self.category,
            name='Computer Diagnostics',
            price=500.00,
            duration_minutes=60
        )

        # 3. Setup Customer A and Customer B
        self.customer_a_user = User.objects.create_user(
            email='customera@example.com',
            password='password123',
            name='Customer Alpha',
            role=User.Role.CUSTOMER
        )
        self.customer_a = CustomerProfile.objects.create(user=self.customer_a_user)

        self.customer_b_user = User.objects.create_user(
            email='customerb@example.com',
            password='password123',
            name='Customer Beta',
            role=User.Role.CUSTOMER
        )
        self.customer_b = CustomerProfile.objects.create(user=self.customer_b_user)

        self.test_date = date.today() + timedelta(days=2) # Future date

    def test_double_booking_is_strictly_prevented(self):
        """
        Assessment Requirement Section 9:
        If Customer A books slot 10:00 - 11:00, Customer B must be blocked from booking the same slot.
        """
        # Step 1: Customer A books 10:00
        booking_a = create_booking_with_lock(
            customer_profile=self.customer_a,
            service_id=self.service.id,
            booking_date_str=self.test_date.strftime('%Y-%m-%d'),
            start_time_str='10:00'
        )
        self.assertIsNotNone(booking_a.id)
        self.assertEqual(booking_a.status, Booking.Status.PENDING)

        # Step 2: Customer B attempts to book the exact same slot (10:00)
        with self.assertRaises(ValidationError) as ctx:
            create_booking_with_lock(
                customer_profile=self.customer_b,
                service_id=self.service.id,
                booking_date_str=self.test_date.strftime('%Y-%m-%d'),
                start_time_str='10:00'
            )
        self.assertIn("just been booked", str(ctx.exception))

    def test_slot_overlapping_is_prevented(self):
        """Customer B booking 10:30 (overlaps with 10:00 - 11:00) is blocked"""
        create_booking_with_lock(
            customer_profile=self.customer_a,
            service_id=self.service.id,
            booking_date_str=self.test_date.strftime('%Y-%m-%d'),
            start_time_str='10:00'
        )

        with self.assertRaises(ValidationError):
            create_booking_with_lock(
                customer_profile=self.customer_b,
                service_id=self.service.id,
                booking_date_str=self.test_date.strftime('%Y-%m-%d'),
                start_time_str='10:30'
            )

    def test_two_hour_cancellation_rule(self):
        """
        Assessment Requirement Section 11:
        Cancellation permitted up to 2 hours before scheduled time.
        """
        # Booking scheduled in 1 hour -> should NOT be allowed to cancel
        soon_dt = datetime.now() + timedelta(minutes=45)
        soon_booking = Booking.objects.create(
            customer=self.customer_a,
            provider=self.provider_profile,
            service=self.service,
            booking_date=soon_dt.date(),
            start_time=soon_dt.time(),
            end_time=(soon_dt + timedelta(minutes=60)).time(),
            total_price=500,
            status=Booking.Status.CONFIRMED
        )
        can_cancel, msg = soon_booking.can_cancel_or_reschedule()
        self.assertFalse(can_cancel)
        self.assertIn("at least 2 hours", msg)

        # Booking scheduled 2 days ahead -> CAN cancel
        future_booking = Booking.objects.create(
            customer=self.customer_a,
            provider=self.provider_profile,
            service=self.service,
            booking_date=self.test_date,
            start_time=time(14, 0),
            end_time=time(15, 0),
            total_price=500,
            status=Booking.Status.CONFIRMED
        )
        can_cancel_future, _ = future_booking.can_cancel_or_reschedule()
        self.assertTrue(can_cancel_future)

    def test_status_transition_state_machine(self):
        """
        Assessment Requirement Section 10:
        Statuses: PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED
        Invalid status transitions must be blocked.
        """
        booking = Booking.objects.create(
            customer=self.customer_a,
            provider=self.provider_profile,
            service=self.service,
            booking_date=self.test_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
            total_price=500,
            status=Booking.Status.PENDING
        )

        # PENDING -> CONFIRMED (Valid)
        booking.transition_to(Booking.Status.CONFIRMED)
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)

        # CONFIRMED -> COMPLETED directly (Invalid! Must be IN_PROGRESS first)
        with self.assertRaises(ValidationError):
            booking.transition_to(Booking.Status.COMPLETED)

        # CONFIRMED -> IN_PROGRESS -> COMPLETED (Valid)
        booking.transition_to(Booking.Status.IN_PROGRESS)
        booking.transition_to(Booking.Status.COMPLETED)
        self.assertEqual(booking.status, Booking.Status.COMPLETED)


class BookingEdgeCaseTests(DoubleBookingPreventionTests):
    def test_booking_outside_working_hours_is_rejected(self):
        with self.assertRaises(ValidationError):
            create_booking_with_lock(self.customer_a, self.service.id, self.test_date.strftime('%Y-%m-%d'), '17:00')

    def test_booking_for_past_date_is_rejected(self):
        with self.assertRaises(ValidationError):
            create_booking_with_lock(self.customer_a, self.service.id, (date.today() - timedelta(days=1)).strftime('%Y-%m-%d'), '10:00')

    def test_booking_rejected_when_provider_unavailable(self):
        Availability.objects.filter(provider=self.provider_profile, day_of_week=self.test_date.weekday()).update(is_available=False)
        with self.assertRaises(ValidationError):
            create_booking_with_lock(self.customer_a, self.service.id, self.test_date.strftime('%Y-%m-%d'), '10:00')

    def test_cancellation_exactly_two_hours_before_is_allowed(self):
        # The exact boundary is allowed by the assessment's 'up to 2 hours before' rule.
        from unittest.mock import patch
        future = timezone_now = __import__('django.utils.timezone', fromlist=['now']).now()
        scheduled = future + timedelta(hours=2)
        booking = Booking.objects.create(customer=self.customer_a, provider=self.provider_profile, service=self.service,
            booking_date=scheduled.date(), start_time=scheduled.time().replace(tzinfo=None),
            end_time=(scheduled + timedelta(hours=1)).time().replace(tzinfo=None), total_price=500, status=Booking.Status.CONFIRMED)
        with patch('django.utils.timezone.now', return_value=future):
            allowed, _ = booking.can_cancel_or_reschedule()
        self.assertTrue(allowed)
