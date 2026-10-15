from rest_framework import serializers
from apps.services.models import Category, Service
from apps.accounts.serializers import ProviderProfileSerializer

class CategorySerializer(serializers.ModelSerializer):
    services_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'services_count']


class ServiceSerializer(serializers.ModelSerializer):
    provider_details = ProviderProfileSerializer(source='provider', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'provider', 'provider_details', 'category', 'category_name', 'category_slug',
            'name', 'description', 'price', 'duration_minutes', 'location', 'image_url',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['provider', 'created_at', 'updated_at']
