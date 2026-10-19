from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, CustomerProfile, ProviderProfile

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ['id', 'address', 'city']


class ProviderProfileSerializer(serializers.ModelSerializer):
    def validate_profile_image(self, image):
        if image and image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Profile image must be 5 MB or smaller.')
        if image and not getattr(image, 'content_type', '').startswith('image/'):
            raise serializers.ValidationError('Upload a valid image file.')
        return image

    class Meta:
        model = ProviderProfile
        fields = [
            'id', 'business_name', 'bio', 'profile_image', 'location', 
            'experience_years', 'rating_cache', 'total_reviews', 'is_verified'
        ]
        read_only_fields = ['rating_cache', 'total_reviews', 'is_verified']


class UserSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)
    provider_profile = ProviderProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'role', 'is_active', 'customer_profile', 'provider_profile', 'created_at']
        read_only_fields = ['is_active', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    business_name = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    experience_years = serializers.IntegerField(required=False, default=1)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'name', 'phone', 'role', 'business_name', 'location', 'experience_years']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be blank.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def create(self, validated_data):
        password = validated_data.pop('password')
        business_name = validated_data.pop('business_name', '')
        location = validated_data.pop('location', 'Kochi')
        experience_years = validated_data.pop('experience_years', 1)

        user = User.objects.create_user(password=password, **validated_data)

        if user.role == User.Role.PROVIDER:
            ProviderProfile.objects.create(
                user=user,
                business_name=business_name or f"{user.name}'s Services",
                location=location or 'Kochi',
                experience_years=experience_years or 1
            )
        else:
            CustomerProfile.objects.create(user=user)

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').lower()
        password = data.get('password', '')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("Your account has been deactivated. Please contact support.")

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email
        refresh['name'] = user.name

        return {
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
