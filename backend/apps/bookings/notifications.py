import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_booking_notification(booking, event_type, extra_context=None):
    """
    Sends email notifications for key booking lifecycle events.
    Fails safely (fail_silently=True) so email issues never disrupt user transactions.
    
    event_type: 'created', 'status_changed', 'cancelled', 'rescheduled'
    """
    try:
        customer_email = getattr(booking.customer.user, 'email', None)
        customer_name = getattr(booking.customer.user, 'name', 'Customer')
        provider_email = getattr(booking.provider.user, 'email', None)
        provider_name = getattr(booking.provider.user, 'name', 'Provider')
        service_name = getattr(booking.service, 'name', 'Service')
        date_str = str(booking.booking_date)
        time_str = f"{booking.start_time.strftime('%H:%M')} - {booking.end_time.strftime('%H:%M')}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@bookmyservice.com')

        subject = ""
        customer_message = ""
        provider_message = ""

        if event_type == 'created':
            subject = f"BookMyService: Booking Requested for {service_name}"
            customer_message = (
                f"Hello {customer_name},\n\n"
                f"Your booking request for '{service_name}' has been received!\n\n"
                f"Details:\n"
                f"- Service Provider: {provider_name}\n"
                f"- Date: {date_str}\n"
                f"- Time: {time_str}\n"
                f"- Total Price: ₹{booking.total_price}\n"
                f"- Status: PENDING\n\n"
                f"You will receive an update once the service provider reviews your booking.\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )
            provider_message = (
                f"Hello {provider_name},\n\n"
                f"You have received a new booking request for '{service_name}'!\n\n"
                f"Details:\n"
                f"- Customer: {customer_name}\n"
                f"- Date: {date_str}\n"
                f"- Time: {time_str}\n"
                f"- Notes: {booking.notes or 'None'}\n\n"
                f"Please log in to your provider dashboard to accept or reject this request.\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )

        elif event_type == 'status_changed':
            subject = f"BookMyService: Booking Status Updated to {booking.status}"
            customer_message = (
                f"Hello {customer_name},\n\n"
                f"The status of your booking for '{service_name}' has been updated to: {booking.status}.\n\n"
                f"Details:\n"
                f"- Provider: {provider_name}\n"
                f"- Date: {date_str}\n"
                f"- Time: {time_str}\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )
            provider_message = (
                f"Hello {provider_name},\n\n"
                f"You marked booking #{booking.id} ('{service_name}') as {booking.status}.\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )

        elif event_type == 'cancelled':
            reason = extra_context.get('reason') if extra_context else getattr(booking, 'cancellation_reason', '')
            subject = f"BookMyService: Booking Cancelled - {service_name}"
            customer_message = (
                f"Hello {customer_name},\n\n"
                f"Your booking #{booking.id} for '{service_name}' on {date_str} has been cancelled.\n"
                f"Reason: {reason or 'Not specified'}\n\n"
                f"The time slot has been freed.\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )
            provider_message = (
                f"Hello {provider_name},\n\n"
                f"Booking #{booking.id} for '{service_name}' with {customer_name} has been cancelled.\n"
                f"Reason: {reason or 'Not specified'}\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )

        elif event_type == 'rescheduled':
            subject = f"BookMyService: Booking Rescheduled - {service_name}"
            customer_message = (
                f"Hello {customer_name},\n\n"
                f"Your booking #{booking.id} for '{service_name}' has been successfully rescheduled.\n\n"
                f"New Schedule:\n"
                f"- Date: {date_str}\n"
                f"- Time: {time_str}\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )
            provider_message = (
                f"Hello {provider_name},\n\n"
                f"Booking #{booking.id} for '{service_name}' has been rescheduled by {customer_name}.\n\n"
                f"New Schedule:\n"
                f"- Date: {date_str}\n"
                f"- Time: {time_str}\n\n"
                f"Best regards,\n"
                f"Team BookMyService"
            )

        # Send to customer
        if customer_email and customer_message:
            send_mail(
                subject=subject,
                message=customer_message,
                from_email=from_email,
                recipient_list=[customer_email],
                fail_silently=True,
            )

        # Send to provider
        if provider_email and provider_message:
            send_mail(
                subject=subject,
                message=provider_message,
                from_email=from_email,
                recipient_list=[provider_email],
                fail_silently=True,
            )

    except Exception as e:
        logger.warning(f"Failed to send booking notification email: {e}")
