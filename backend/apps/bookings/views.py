from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.db.models import Sum, Count, Q
from datetime import datetime

from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.services.models import Service
from apps.bookings.models import Availability, Booking, Review
from apps.bookings.serializers import AvailabilitySerializer, BookingSerializer, ReviewSerializer
from apps.bookings.services import get_available_slots_for_provider, create_booking_with_lock, reschedule_booking_with_lock
from apps.accounts.permissions import IsCustomer, IsProvider, IsAdmin

class AvailableSlotsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        service_id = request.query_params.get('service_id')
        date_str = request.query_params.get('date')

        if not service_id or not date_str:
            return Response({'error': 'service_id and date (YYYY-MM-DD) are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            service = Service.objects.select_related('provider').get(id=service_id, is_active=True)
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Service.DoesNotExist:
            return Response({'error': 'Service not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        slots = get_available_slots_for_provider(service.provider, service, target_date)
        return Response({
            'service_id': service.id,
            'service_name': service.name,
            'duration_minutes': service.duration_minutes,
            'provider_name': service.provider.business_name,
            'date': str(target_date),
            'slots': slots
        })


class CreateBookingView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request):
        customer_profile = request.user.customer_profile
        service_id = request.data.get('service_id')
        booking_date = request.data.get('date')
        start_time = request.data.get('time')
        notes = request.data.get('notes', '')

        if not service_id or not booking_date or not start_time:
            return Response({'error': 'service_id, date, and time are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = create_booking_with_lock(
                customer_profile=customer_profile,
                service_id=service_id,
                booking_date_str=booking_date,
                start_time_str=start_time,
                notes=notes
            )
            return Response({
                'message': 'Booking requested successfully!',
                'booking': BookingSerializer(booking).data
            }, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'An unexpected error occurred while booking.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerBookingsView(generics.ListAPIView):
    permission_classes = [IsCustomer]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(customer=self.request.user.customer_profile).select_related(
            'service', 'provider', 'customer__user'
        ).order_by('-booking_date', '-start_time')


class ProviderBookingsView(generics.ListAPIView):
    permission_classes = [IsProvider]
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.filter(provider=self.request.user.provider_profile).select_related(
            'service', 'customer__user', 'provider'
        ).order_by('-booking_date', '-start_time')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        return queryset


class UpdateBookingStatusView(APIView):
    permission_classes = [IsProvider]

    def patch(self, request, pk):
        provider = request.user.provider_profile
        new_status = request.data.get('status', '').upper()

        try:
            booking = Booking.objects.get(id=pk, provider=provider)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            booking.transition_to(new_status)
            return Response({
                'message': f"Booking status updated to {new_status}.",
                'booking': BookingSerializer(booking).data
            })
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        reason = request.data.get('reason', '')

        try:
            if user.role == User.Role.CUSTOMER:
                booking = Booking.objects.get(id=pk, customer=user.customer_profile)
                can_cancel, err = booking.can_cancel_or_reschedule()
                if not can_cancel:
                    return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
            elif user.role == User.Role.PROVIDER:
                booking = Booking.objects.get(id=pk, provider=user.provider_profile)
            else: # Admin
                booking = Booking.objects.get(id=pk)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        booking.status = Booking.Status.CANCELLED
        booking.cancellation_reason = reason
        booking.save(update_fields=['status', 'cancellation_reason', 'updated_at'])

        return Response({
            'message': 'Booking cancelled successfully. The time slot is now available again.',
            'booking': BookingSerializer(booking).data
        })


class RescheduleBookingView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        new_date = request.data.get('date')
        new_time = request.data.get('time')

        if not new_date or not new_time:
            return Response({'error': 'New date and time are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.get(id=pk, customer=request.user.customer_profile)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            rescheduled = reschedule_booking_with_lock(booking, new_date, new_time)
            return Response({
                'message': 'Booking rescheduled successfully!',
                'booking': BookingSerializer(rescheduled).data
            })
        except ValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)}, status=status.HTTP_400_BAD_REQUEST)


class SubmitReviewView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(id=pk, customer=request.user.customer_profile)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != Booking.Status.COMPLETED:
            return Response({'error': 'Reviews can only be submitted for completed services.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(booking, 'review'):
            return Response({'error': 'You have already reviewed this booking.'}, status=status.HTTP_400_BAD_REQUEST)

        rating = request.data.get('rating')
        comment = request.data.get('comment', '')

        if not rating or not (1 <= int(rating) <= 5):
            return Response({'error': 'Rating must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        review = Review.objects.create(
            booking=booking,
            customer=booking.customer,
            provider=booking.provider,
            rating=int(rating),
            comment=comment
        )

        return Response({
            'message': 'Thank you! Your review has been recorded.',
            'review': ReviewSerializer(review).data
        }, status=status.HTTP_201_CREATED)


class ProviderAvailabilityView(APIView):
    permission_classes = [IsProvider]

    def get(self, request):
        provider = request.user.provider_profile
        availabilities = Availability.objects.filter(provider=provider).order_by('day_of_week')
        return Response(AvailabilitySerializer(availabilities, many=True).data)

    def post(self, request):
        provider = request.user.provider_profile
        schedules_data = request.data.get('schedules', [])

        for item in schedules_data:
            day = item.get('day_of_week')
            is_available = item.get('is_available', True)
            start_time = item.get('start_time', '09:00')
            end_time = item.get('end_time', '17:00')

            Availability.objects.update_or_create(
                provider=provider,
                day_of_week=day,
                defaults={
                    'start_time': start_time,
                    'end_time': end_time,
                    'is_available': is_available
                }
            )

        availabilities = Availability.objects.filter(provider=provider).order_by('day_of_week')
        return Response({
            'message': 'Availability schedule updated successfully.',
            'schedules': AvailabilitySerializer(availabilities, many=True).data
        })


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        total_customers = User.objects.filter(role=User.Role.CUSTOMER).count()
        total_providers = User.objects.filter(role=User.Role.PROVIDER).count()
        total_services = Service.objects.count()
        total_bookings = Booking.objects.count()

        pending_bookings = Booking.objects.filter(status=Booking.Status.PENDING).count()
        confirmed_bookings = Booking.objects.filter(status=Booking.Status.CONFIRMED).count()
        in_progress_bookings = Booking.objects.filter(status=Booking.Status.IN_PROGRESS).count()
        completed_bookings = Booking.objects.filter(status=Booking.Status.COMPLETED).count()
        cancelled_bookings = Booking.objects.filter(status=Booking.Status.CANCELLED).count()

        total_revenue = Booking.objects.filter(status=Booking.Status.COMPLETED).aggregate(total=Sum('total_price'))['total'] or 0

        recent_bookings = Booking.objects.select_related('customer__user', 'provider', 'service').order_by('-created_at')[:10]

        return Response({
            'stats': {
                'total_customers': total_customers,
                'total_providers': total_providers,
                'total_services': total_services,
                'total_bookings': total_bookings,
                'pending_bookings': pending_bookings,
                'confirmed_bookings': confirmed_bookings,
                'in_progress_bookings': in_progress_bookings,
                'completed_bookings': completed_bookings,
                'cancelled_bookings': cancelled_bookings,
                'total_revenue': float(total_revenue),
            },
            'recent_bookings': BookingSerializer(recent_bookings, many=True).data
        })
