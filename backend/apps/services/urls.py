from django.urls import path
from apps.services.views import (
    CategoryListView, ServiceListView, ServiceDetailView,
    ProviderServiceListCreateView, ProviderServiceDetailView, AdminServiceListView, AdminServiceDetailView, AdminCategoryDetailView
)

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('services/', ServiceListView.as_view(), name='service_list'),
    path('services/<int:pk>/', ServiceDetailView.as_view(), name='service_detail'),
    path('provider/services/', ProviderServiceListCreateView.as_view(), name='provider_services'),
    path('provider/services/<int:pk>/', ProviderServiceDetailView.as_view(), name='provider_service_detail'),
    path('admin/services/', AdminServiceListView.as_view(), name='admin_services'),
    path('admin/services/<int:pk>/', AdminServiceDetailView.as_view(), name='admin_service_detail'),
    path('admin/categories/<int:pk>/', AdminCategoryDetailView.as_view(), name='admin_category_detail'),
]
