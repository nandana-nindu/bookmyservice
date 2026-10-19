from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, time, timedelta

from apps.accounts.models import CustomerProfile, ProviderProfile
from apps.services.models import Service

class Availability(models.Model):
    DAYS_OF_WEEK = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )

    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField(default=time(9, 0))
    end_time = models.TimeField(default=time(17, 0))
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ('provider', 'day_of_week')
        verbose_name_plural = 'Availabilities'
        ordering = ['day_of_week']

    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK).get(self.day_of_week)
        if not self.is_available:
            return f"{self.provider.business_name} - {day_name}: Closed"
        return f"{self.provider.business_name} - {day_name}: {self.start_time.strftime('%H:%M')} to {self.end_time.strftime('%H:%M')}"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        REJECTED = 'REJECTED', 'Rejected'

    # Legal transitions dictionary
    VALID_TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.REJECTED, Status.CANCELLED],
        Status.CONFIRMED: [Status.IN_PROGRESS, Status.CANCELLED],
        Status.IN_PROGRESS: [Status.COMPLETED],
        Status.COMPLETED: [],
        Status.CANCELLED: [],
        Status.REJECTED: [],
    }

    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='bookings')
    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    cancellation_reason = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-booking_date', '-start_time']
        indexes = [
            models.Index(fields=['provider', 'booking_date', 'status']),
            models.Index(fields=['customer', 'status']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(end_time__gt=models.F('start_time')), name='booking_end_after_start'),
            models.CheckConstraint(condition=models.Q(total_price__gte=0), name='booking_price_nonnegative'),
        ]

    def __str__(self):
        return f"Booking #{self.id} - {self.service.name} for {self.customer.user.name} ({self.status})"

    def get_scheduled_datetime(self):
        return datetime.combine(self.booking_date, self.start_time)

    def can_cancel_or_reschedule(self):
        """Cancellation/rescheduling is permitted up to 2 hours before scheduled time"""
        if self.status not in [self.Status.PENDING, self.Status.CONFIRMED]:
            return False, "Only PENDING or CONFIRMED bookings can be cancelled or rescheduled."
        
        scheduled_dt = self.get_scheduled_datetime()
        # booking_date/start_time are local wall-clock values for the configured service timezone.
        now_dt = timezone.localtime(timezone.now()).replace(tzinfo=None)

        if scheduled_dt - now_dt < timedelta(hours=2):
            return False, "Cancellations or rescheduling must be done at least 2 hours before scheduled time."
        return True, ""

    def transition_to(self, new_status, actor_role=None):
        if new_status == self.status:
            return True

        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValidationError(f"Invalid transition from {self.status} to {new_status}.")

        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])
        return True


class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='reviews')
    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.booking.status != Booking.Status.COMPLETED:
            raise ValidationError("Reviews can only be submitted for COMPLETED bookings.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.provider.update_rating()

    def __str__(self):
        return f"Review for {self.provider.business_name} ({self.rating}/5)"
