from django.db import models
from apps.accounts.models import ProviderProfile

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, default='bi-wrench', help_text='Bootstrap icon class name')

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Service(models.Model):
    DURATION_CHOICES = (
        (30, '30 Minutes'),
        (60, '60 Minutes (1 Hour)'),
        (90, '90 Minutes (1.5 Hours)'),
        (120, '120 Minutes (2 Hours)'),
        (180, '180 Minutes (3 Hours)'),
    )

    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='services')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(choices=DURATION_CHOICES, default=60)
    location = models.CharField(max_length=150, blank=True, default='')
    image_url = models.URLField(max_length=500, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.location and self.provider:
            self.location = self.provider.location
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.provider.business_name} (₹{self.price})"
