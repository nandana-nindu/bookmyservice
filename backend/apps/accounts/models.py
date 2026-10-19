from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import RegexValidator

phone_regex = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
)

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            raise ValueError('Password is required')
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Customer'
        PROVIDER = 'PROVIDER', 'Service Provider'
        ADMIN = 'ADMIN', 'Administrator'

    email = models.EmailField(unique=True, max_length=255)
    name = models.CharField(max_length=255)
    phone = models.CharField(validators=[phone_regex], max_length=17, blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return f"{self.email} ({self.role})"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    address = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f"Customer: {self.user.name}"


class ProviderProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider_profile')
    business_name = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    profile_image = models.ImageField(upload_to='provider_profiles/', blank=True, null=True)
    location = models.CharField(max_length=150, default='Kochi')
    experience_years = models.PositiveIntegerField(default=1)
    rating_cache = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    total_reviews = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=True)

    def update_rating(self):
        from apps.bookings.models import Review
        reviews = Review.objects.filter(provider=self)
        count = reviews.count()
        if count > 0:
            total = sum([r.rating for r in reviews])
            self.rating_cache = round(total / count, 2)
            self.total_reviews = count
        else:
            self.rating_cache = 5.00
            self.total_reviews = 0
        self.save()

    def __str__(self):
        return self.business_name or f"Provider: {self.user.name}"
