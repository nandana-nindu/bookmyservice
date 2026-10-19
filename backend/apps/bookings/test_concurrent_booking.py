"""Real concurrent booking regression test (runs against PostgreSQL only).

SQLite does not implement SELECT FOR UPDATE and therefore cannot validate the
production row-locking strategy. The PostgreSQL exclusion constraint is applied
by migration 0003 and provides a second, database-enforced safety layer.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, time, timedelta
from threading import Barrier
from unittest import skipUnless
from django.db import connection, close_old_connections
from django.test import TransactionTestCase
from django.core.exceptions import ValidationError
from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.services.models import Category, Service
from apps.bookings.models import Availability, Booking
from apps.bookings.services import create_booking_with_lock

@skipUnless(connection.vendor == 'postgresql', 'Concurrent row-lock test requires PostgreSQL.')
class ConcurrentBookingTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        provider_user = User.objects.create_user(email='concurrent-provider@example.com', password='StrongPass123!', name='Provider', role=User.Role.PROVIDER)
        self.provider = ProviderProfile.objects.create(user=provider_user, business_name='Concurrent Provider')
        self.category = Category.objects.create(name='Concurrency Test', slug='concurrency-test')
        self.service = Service.objects.create(provider=self.provider, category=self.category, name='Test Slot', description='Test', price=100, duration_minutes=60)
        self.customers = []
        for i in range(2):
            user = User.objects.create_user(email=f'concurrent-customer-{i}@example.com', password='StrongPass123!', name=f'Customer {i}', role=User.Role.CUSTOMER)
            self.customers.append(CustomerProfile.objects.create(user=user))
        for day in range(7):
            Availability.objects.create(provider=self.provider, day_of_week=day, start_time=time(9), end_time=time(17), is_available=True)
        self.future_date = date.today() + timedelta(days=5)

    def test_only_one_simultaneous_request_can_claim_same_slot(self):
        barrier = Barrier(2)
        def attempt(customer):
            close_old_connections()
            barrier.wait(timeout=5)
            try:
                create_booking_with_lock(customer, self.service.id, self.future_date.isoformat(), '10:00')
                return 'created'
            except Exception:
                return 'rejected'
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(attempt, self.customers))
        self.assertEqual(results.count('created'), 1)
        self.assertEqual(Booking.objects.filter(provider=self.provider, booking_date=self.future_date, start_time=time(10), status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS]).count(), 1)
