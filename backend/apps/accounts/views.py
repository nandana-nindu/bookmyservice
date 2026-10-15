from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.accounts.serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    CustomerProfileSerializer, ProviderProfileSerializer
)
from apps.accounts.permissions import IsAdmin

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Registration successful! You can now log in.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        name = request.data.get('name')
        phone = request.data.get('phone')

        if name:
            user.name = name
        if phone:
            user.phone = phone
        user.save()

        # Update profile specific fields
        if user.role == User.Role.PROVIDER and hasattr(user, 'provider_profile'):
            p = user.provider_profile
            p.business_name = request.data.get('business_name', p.business_name)
            p.bio = request.data.get('bio', p.bio)
            p.location = request.data.get('location', p.location)
            p.experience_years = request.data.get('experience_years', p.experience_years)
            p.save()
        elif user.role == User.Role.CUSTOMER and hasattr(user, 'customer_profile'):
            c = user.customer_profile
            c.address = request.data.get('address', c.address)
            c.city = request.data.get('city', c.city)
            c.save()

        return Response(UserSerializer(user).data)


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-created_at')


class AdminToggleUserStatusView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == User.Role.ADMIN:
            return Response({'error': 'Cannot deactivate admin accounts.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            'message': f"User {'activated' if user.is_active else 'deactivated'} successfully.",
            'is_active': user.is_active
        })
