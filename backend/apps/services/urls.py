from django.urls import path
from apps.services.views import (
    CategoryListView, ServiceListView, ServiceDetailView,
    ProviderServiceListCreateView, ProviderServiceDetailView
)

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('services/', ServiceListView.as_view(), name='service_list'),
    path('services/<int:pk>/', ServiceDetailView.as_view(), name='service_detail'),
    path('provider/services/', ProviderServiceListCreateView.as_view(), name='provider_services'),
    path('provider/services/<int:pk>/', ProviderServiceDetailView.as_view(), name='provider_service_detail'),
]
