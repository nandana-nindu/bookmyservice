from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User, ProviderProfile
from apps.services.models import Category, Service

class ServicePermissionsTests(TestCase):
    def setUp(self):
        self.provider_user = User.objects.create_user(email='p@example.com', password='StrongPass123!', name='Provider', role=User.Role.PROVIDER)
        self.provider = ProviderProfile.objects.create(user=self.provider_user, business_name='Test Services')
        self.category = Category.objects.create(name='Repairs', slug='repairs')
        self.service = Service.objects.create(provider=self.provider, category=self.category, name='Repair', description='Test', price=100, duration_minutes=60)

    def test_public_can_browse_active_services(self):
        response = APIClient().get('/api/services/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_provider_cannot_edit_another_providers_service(self):
        other_user = User.objects.create_user(email='other@example.com', password='StrongPass123!', name='Other', role=User.Role.PROVIDER)
        ProviderProfile.objects.create(user=other_user, business_name='Other')
        client = APIClient(); client.force_authenticate(user=other_user)
        response = client.patch(f'/api/provider/services/{self.service.id}/', {'name': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, 404)
