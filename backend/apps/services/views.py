from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db.models import Count, Q

from apps.services.models import Category, Service
from apps.services.serializers import CategorySerializer, ServiceSerializer
from apps.accounts.permissions import IsProvider, IsAdmin

class CategoryListView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return Category.objects.annotate(services_count=Count('services', filter=Q(services__is_active=True))).order_by('name')


class ServiceListView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Service.objects.filter(is_active=True).select_related('provider', 'category', 'provider__user')

        # Filter: category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(Q(category__slug=category) | Q(category__id=category) if category.isdigit() else Q(category__slug=category))

        # Filter: search query (name or description or provider business name)
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(provider__business_name__icontains=q)
            )

        # Filter: location
        location = self.request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)

        # Filter: min & max price
        min_price = self.request.query_params.get('min_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Filter: min rating
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(provider__rating_cache__gte=min_rating)

        # Filter: provider
        provider_id = self.request.query_params.get('provider_id')
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)

        # Order by
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['price', '-price', 'created_at', '-created_at', 'provider__rating_cache', '-provider__rating_cache']:
            queryset = queryset.order_by(ordering)

        return queryset


class ServiceDetailView(generics.RetrieveAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Service.objects.all().select_related('provider', 'category', 'provider__user')


class ProviderServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsProvider]

    def get_queryset(self):
        provider = self.request.user.provider_profile
        return Service.objects.filter(provider=provider).order_by('-created_at')

    def perform_create(self, serializer):
        provider = self.request.user.provider_profile
        serializer.save(provider=provider)


class ProviderServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsProvider]

    def get_queryset(self):
        provider = self.request.user.provider_profile
        return Service.objects.filter(provider=provider)
