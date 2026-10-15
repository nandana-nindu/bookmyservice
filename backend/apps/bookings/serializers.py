from rest_framework import serializers
from apps.bookings.models import Availability, Booking, Review
from apps.services.serializers import ServiceSerializer

class AvailabilitySerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = Availability
        fields = ['id', 'day_of_week', 'day_name', 'start_time', 'end_time', 'is_available']


class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['customer', 'provider', 'created_at']


class BookingSerializer(serializers.ModelSerializer):
    service_details = ServiceSerializer(source='service', read_only=True)
    customer_name = serializers.CharField(source='customer.user.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.user.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.user.email', read_only=True)
    provider_name = serializers.CharField(source='provider.business_name', read_only=True)
    provider_location = serializers.CharField(source='provider.location', read_only=True)
    can_cancel = serializers.SerializerMethodField()
    review = ReviewSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'customer_email',
            'provider', 'provider_name', 'provider_location',
            'service', 'service_details',
            'booking_date', 'start_time', 'end_time', 'status', 'total_price',
            'notes', 'cancellation_reason', 'can_cancel', 'review',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['customer', 'provider', 'end_time', 'total_price', 'status', 'created_at', 'updated_at']

    def get_can_cancel(self, obj):
        can_cancel, _ = obj.can_cancel_or_reschedule()
        return can_cancel
