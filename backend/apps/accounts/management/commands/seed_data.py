from datetime import time
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.services.models import Category, Service
from apps.bookings.models import Availability


class Command(BaseCommand):
    help = "Create or refresh the BookMyService demo categories, users, providers, services and images."

    # Demo-only accounts from the previous sample dataset. These are removed so the new
    # credentials and demo catalogue are consistent after running this command.
    LEGACY_EMAILS = [
        # Accounts from older bundled demo datasets; recreate the current demo set below.
        "admin@bookmyservice.com", "customer@bookmyservice.com", "nandana@bookmyservice.com",
        "apex.tech@bookmyservice.com", "coolbreeze@bookmyservice.com",
        "sparkle@bookmyservice.com", "quickplumb@bookmyservice.com",
        "admin.demo@bookmyservice.com", "customer.aarav@bookmyservice.com",
        "customer.meera@bookmyservice.com", "urban.spark@bookmyservice.com",
        "coolcare.team@bookmyservice.com", "fixit.home@bookmyservice.com",
        "pixelcraft@bookmyservice.com", "nandana@gmail.com", "rahul@gmail.com",
        "customer@gmail.com", "provider@gmail.com", "coolcare@gmail.com",
        "handyman@gmail.com", "techsupport@gmail.com", "admin@gmail.com",
    ]
    LEGACY_CATEGORY_SLUGS = [
        "laptop-repair", "ac-service", "home-cleaning", "plumbing", "car-service",
        "photography", "electrical-service", "website-development",
    ]

    def handle(self, *args, **options):
        with transaction.atomic():
            self.stdout.write("Refreshing BookMyService demo data...")
            # Remove only known accounts from the previous built-in demo set.
            User.objects.filter(email__in=self.LEGACY_EMAILS).delete()
            Category.objects.filter(slug__in=self.LEGACY_CATEGORY_SLUGS).delete()

            categories_data = [
                {"name": "Appliance Repair", "slug": "appliance-repair", "icon": "bi-tools", "description": "Reliable repairs for everyday home appliances."},
                {"name": "AC & Cooling", "slug": "ac-cooling", "icon": "bi-snow", "description": "Air conditioner cleaning, installation and cooling maintenance."},
                {"name": "Home Cleaning", "slug": "home-cleaning-plus", "icon": "bi-house-heart", "description": "Deep cleaning and refresh services for every room."},
                {"name": "Plumbing", "slug": "plumbing-care", "icon": "bi-wrench-adjustable", "description": "Leaks, fixtures, drainage and water-flow problems."},
                {"name": "Electrical", "slug": "electrical-care", "icon": "bi-lightning-charge", "description": "Safe electrical repairs, installation and inspection."},
                {"name": "Car Care", "slug": "car-care", "icon": "bi-car-front", "description": "Detailing and care to keep your vehicle looking its best."},
                {"name": "Beauty & Wellness", "slug": "beauty-wellness", "icon": "bi-stars", "description": "Convenient personal care and grooming appointments."},
                {"name": "Photography & Events", "slug": "photography-events", "icon": "bi-camera", "description": "Portraits, family events and special occasions."},
                {"name": "Tech Support", "slug": "tech-support", "icon": "bi-wifi", "description": "Home network, device and technology assistance."},
                {"name": "Garden & Moving", "slug": "garden-moving", "icon": "bi-box-seam", "description": "Garden maintenance and practical moving support."},
            ]
            categories = {}
            for item in categories_data:
                obj, _ = Category.objects.update_or_create(slug=item["slug"], defaults=item)
                categories[item["slug"]] = obj

            # Stable local image paths are served from Django MEDIA_URL, so demo cards
            # do not depend on external image hosting or internet access.
            providers = [
                {
                    "email": "provider@gmail.com", "password": "provider123", "name": "Ananya Menon",
                    "phone": "+919810000101", "business": "Urban Spark Home Care", "location": "Kochi - Panampilly Nagar",
                    "bio": "A friendly home-care team focused on thoughtful cleaning, reliable visits and tidy spaces.",
                    "experience": 6, "rating": "4.90", "image": "demo_providers/urban_spark.png",
                    "services": [
                        ("Signature Home Deep Clean", "home-cleaning-plus", 1899, 180, "Room-by-room deep clean for floors, surfaces, kitchen and bathrooms.", "demo_services/home_clean.png"),
                        ("Move-in Refresh Clean", "home-cleaning-plus", 1299, 120, "A detailed clean to help make a new home feel ready.", "demo_services/home_clean.png"),
                        ("Garden Tidy-up Visit", "garden-moving", 799, 60, "Light pruning, leaf clearing and a neat-up of small home gardens.", "demo_services/garden.png"),
                        ("Family Event Photography", "photography-events", 2499, 120, "A relaxed photography session for family gatherings and small celebrations.", "demo_services/photography.png"),
                    ],
                },
                {
                    "email": "coolcare@gmail.com", "password": "provider123", "name": "Faisal Rahman",
                    "phone": "+919810000102", "business": "CoolCare Climate Services", "location": "Kochi - Kakkanad",
                    "bio": "Residential cooling specialists offering careful AC cleaning, installation and maintenance.",
                    "experience": 8, "rating": "4.80", "image": "demo_providers/coolcare.png",
                    "services": [
                        ("AC Deep Clean & Filter Care", "ac-cooling", 749, 60, "Indoor unit cleaning, filter care and a basic cooling performance check.", "demo_services/ac_clean.png"),
                        ("AC Installation Visit", "ac-cooling", 1499, 120, "Professional installation assessment and standard unit mounting support.", "demo_services/ac_clean.png"),
                        ("Refrigerator Repair Assessment", "appliance-repair", 499, 60, "Troubleshooting visit for cooling, noise and common refrigerator issues.", "demo_services/appliance_fix.png"),
                        ("Car Interior & Exterior Detail", "car-care", 1799, 180, "A careful interior and exterior refresh for everyday vehicles.", "demo_services/car_detail.png"),
                    ],
                },
                {
                    "email": "handyman@gmail.com", "password": "provider123", "name": "Sanjay Varma",
                    "phone": "+919810000103", "business": "FixIt Home Solutions", "location": "Kochi - Palarivattom",
                    "bio": "Experienced home technician for plumbing, electrical checks and practical repairs.",
                    "experience": 9, "rating": "4.70", "image": "demo_providers/fixit_home.png",
                    "services": [
                        ("Tap & Pipe Leak Repair", "plumbing-care", 399, 60, "Inspection and repair of common tap, connector and visible pipe leaks.", "demo_services/plumbing.png"),
                        ("Electrical Safety Check", "electrical-care", 599, 60, "A home visit to inspect common fixtures, switches and visible electrical concerns.", "demo_services/electrical.png"),
                        ("Washer Service Visit", "appliance-repair", 549, 60, "Initial troubleshooting for drainage, vibration and common washer issues.", "demo_services/appliance_fix.png"),
                        ("Home Moving Assistance", "garden-moving", 999, 120, "Practical help packing, carrying and organizing household items for a local move.", "demo_services/moving.png"),
                    ],
                },
                {
                    "email": "techsupport@gmail.com", "password": "provider123", "name": "Diya Thomas",
                    "phone": "+919810000104", "business": "PixelCraft Tech Assist", "location": "Kochi - Edappally",
                    "bio": "Patient tech support for laptops, home Wi-Fi and everyday connected devices.",
                    "experience": 5, "rating": "4.85", "image": "demo_providers/pixelcraft.png",
                    "services": [
                        ("Laptop Tune-up & Health Check", "tech-support", 699, 60, "Performance check, cleanup guidance, updates and device health review.", "demo_services/laptop_check.png"),
                        ("Home Wi-Fi Setup", "tech-support", 599, 60, "Router placement, Wi-Fi setup and connectivity troubleshooting.", "demo_services/wifi_setup.png"),
                        ("Phone Screen Repair Assessment", "appliance-repair", 399, 30, "Initial inspection for screen, charging and common phone hardware issues.", "demo_services/phone_repair.png"),
                        ("At-home Grooming Appointment", "beauty-wellness", 899, 60, "A convenient personal grooming appointment in the comfort of your home.", "demo_services/beauty.png"),
                    ],
                },
            ]

            # New demo users and clear repeatable passwords.
            self.upsert_user("admin@gmail.com", "admin123", "Demo Administrator", "+919810000199", User.Role.ADMIN, staff=True, superuser=True)
            customers = [
                ("nandana@gmail.com", "nandana123", "Nandana Menon", "+919810000201", "Marine Drive", "Kochi"),
                ("rahul@gmail.com", "rahul123", "Rahul Sharma", "+919810000202", "MG Road", "Kochi"),
            ]
            for email, password, name, phone, address, city in customers:
                user = self.upsert_user(email, password, name, phone, User.Role.CUSTOMER)
                CustomerProfile.objects.update_or_create(user=user, defaults={"address": address, "city": city})

            for p in providers:
                user = self.upsert_user(p["email"], p["password"], p["name"], p["phone"], User.Role.PROVIDER)
                profile, _ = ProviderProfile.objects.update_or_create(user=user, defaults={
                    "business_name": p["business"], "location": p["location"], "bio": p["bio"],
                    "experience_years": p["experience"], "rating_cache": p["rating"], "total_reviews": 18,
                    "profile_image": p["image"], "is_verified": True,
                })
                for day in range(7):
                    if day < 5:
                        defaults = {"start_time": time(9, 0), "end_time": time(18, 0), "is_available": True}
                    elif day == 5:
                        defaults = {"start_time": time(10, 0), "end_time": time(15, 0), "is_available": True}
                    else:
                        defaults = {"start_time": time(9, 0), "end_time": time(17, 0), "is_available": False}
                    Availability.objects.update_or_create(provider=profile, day_of_week=day, defaults=defaults)
                for name, category_slug, price, duration, desc, image_path in p["services"]:
                    Service.objects.update_or_create(
                        provider=profile, name=name,
                        defaults={"category": categories[category_slug], "price": price,
                                  "duration_minutes": duration, "description": desc,
                                  "location": p["location"], "image_url": "/media/" + image_path,
                                  "is_active": True}
                    )

            # Remove unused categories from the old built-in sample set only after old users/services were removed.
            self.stdout.write(self.style.SUCCESS("Demo data refreshed successfully."))
            self.stdout.write("Demo accounts (local development only):")
            self.stdout.write("  ADMIN    admin@gmail.com / admin123")
            self.stdout.write("  CUSTOMER nandana@gmail.com / nandana123")
            self.stdout.write("  CUSTOMER rahul@gmail.com / rahul123")
            self.stdout.write("  PROVIDER provider@gmail.com / provider123")
            self.stdout.write("  PROVIDER coolcare@gmail.com / provider123")
            self.stdout.write("  PROVIDER handyman@gmail.com / provider123")
            self.stdout.write("  PROVIDER techsupport@gmail.com / provider123")

    def upsert_user(self, email, password, name, phone, role, staff=False, superuser=False):
        user, _ = User.objects.update_or_create(email=email, defaults={
            "name": name, "phone": phone, "role": role, "is_active": True,
            "is_staff": staff, "is_superuser": superuser,
        })
        user.set_password(password)
        user.save()
        return user
