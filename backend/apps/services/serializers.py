from rest_framework import serializers
from apps.services.models import Category, Service
from apps.accounts.serializers import ProviderProfileSerializer

class CategorySerializer(serializers.ModelSerializer):
    services_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'services_count']


class ServiceSerializer(serializers.ModelSerializer):
    def validate_image(self, image):
        if image and image.size > 8 * 1024 * 1024:
            raise serializers.ValidationError('Service image must be 8 MB or smaller.')
        if image and not getattr(image, 'content_type', '').startswith('image/'):
            raise serializers.ValidationError('Upload a valid image file.')
        return image

    provider_details = ProviderProfileSerializer(source='provider', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'provider', 'provider_details', 'category', 'category_name', 'category_slug',
            'name', 'description', 'price', 'duration_minutes', 'location', 'image_url', 'image',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['provider', 'created_at', 'updated_at']
