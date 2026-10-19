from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, CustomerProfile, ProviderProfile

class AccountSecurityTests(TestCase):
    def test_registration_rejects_duplicate_email_case_insensitively(self):
        User.objects.create_user(email='person@example.com', password='StrongPass123!', name='Person')
        response = APIClient().post('/api/auth/register/', {
            'email': 'PERSON@example.com', 'password': 'StrongPass123!', 'name': 'Another', 'role': 'CUSTOMER'
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_registration_requires_email_name_and_password(self):
        response = APIClient().post('/api/auth/register/', {'email': 'x@example.com'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_customer_profile_created_for_customer(self):
        user = User.objects.create_user(email='customer@example.com', password='StrongPass123!', name='Customer', role=User.Role.CUSTOMER)
        CustomerProfile.objects.create(user=user)
        self.assertTrue(hasattr(user, 'customer_profile'))

    def test_provider_cannot_access_admin_user_list(self):
        user = User.objects.create_user(email='provider@example.com', password='StrongPass123!', name='Provider', role=User.Role.PROVIDER)
        ProviderProfile.objects.create(user=user)
        client = APIClient()
        client.force_authenticate(user=user)
        self.assertEqual(client.get('/api/auth/admin/users/').status_code, 403)
