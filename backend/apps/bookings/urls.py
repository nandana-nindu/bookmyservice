from django.urls import path
from apps.bookings.views import (
    AvailableSlotsView, CreateBookingView, CustomerBookingsView,
    ProviderBookingsView, UpdateBookingStatusView, CancelBookingView,
    RescheduleBookingView, SubmitReviewView, ProviderAvailabilityView,
    AdminDashboardStatsView
)

urlpatterns = [
    path('slots/', AvailableSlotsView.as_view(), name='available_slots'),
    path('', CreateBookingView.as_view(), name='create_booking'),
    path('my-bookings/', CustomerBookingsView.as_view(), name='customer_bookings'),
    path('provider-bookings/', ProviderBookingsView.as_view(), name='provider_bookings'),
    path('<int:pk>/status/', UpdateBookingStatusView.as_view(), name='update_status'),
    path('<int:pk>/cancel/', CancelBookingView.as_view(), name='cancel_booking'),
    path('<int:pk>/reschedule/', RescheduleBookingView.as_view(), name='reschedule_booking'),
    path('<int:pk>/review/', SubmitReviewView.as_view(), name='submit_review'),
    path('availability/', ProviderAvailabilityView.as_view(), name='provider_availability'),
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin_stats'),
]
