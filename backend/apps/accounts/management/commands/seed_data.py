from datetime import time
from django.core.management.base import BaseCommand
from django.db import transaction
# pyrefly: ignore [missing-import]
from apps.accounts.models import User, CustomerProfile, ProviderProfile
# pyrefly: ignore [missing-import]
from apps.services.models import Category, Service
# pyrefly: ignore [missing-import]
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

            # High-quality Unsplash image URLs for each service & provider so cards look great without local disk storage
            providers = [
                {
                    "email": "provider@gmail.com", "password": "provider123", "name": "Ananya Menon",
                    "phone": "+919810000101", "business": "Urban Spark Home Care", "location": "Kochi - Panampilly Nagar",
                    "bio": "A friendly home-care team focused on thoughtful cleaning, reliable visits and tidy spaces.",
                    "experience": 6, "rating": "4.90",
                    "image": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
                    "services": [
                        ("Signature Home Deep Clean", "home-cleaning-plus", 1899, 180, "Room-by-room deep clean for floors, surfaces, kitchen and bathrooms.", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80"),
                        ("Move-in Refresh Clean", "home-cleaning-plus", 1299, 120, "A detailed clean to help make a new home feel ready.", "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop&q=80"),
                        ("Garden Tidy-up Visit", "garden-moving", 799, 60, "Light pruning, leaf clearing and a neat-up of small home gardens.", "https://images.unsplash.com/photo-1558904541-efa8c4a08931?w=800&auto=format&fit=crop&q=80"),
                        ("Family Event Photography", "photography-events", 2499, 120, "A relaxed photography session for family gatherings and small celebrations.", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80"),
                    ],
                },
                {
                    "email": "coolcare@gmail.com", "password": "provider123", "name": "Faisal Rahman",
                    "phone": "+919810000102", "business": "CoolCare Climate Services", "location": "Kochi - Kakkanad",
                    "bio": "Residential cooling specialists offering careful AC cleaning, installation and maintenance.",
                    "experience": 8, "rating": "4.80",
                    "image": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
                    "services": [
                        ("AC Deep Clean & Filter Care", "ac-cooling", 749, 60, "Indoor unit cleaning, filter care and a basic cooling performance check.", "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80"),
                        ("AC Installation Visit", "ac-cooling", 1499, 120, "Professional installation assessment and standard unit mounting support.", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80"),
                        ("Refrigerator Repair Assessment", "appliance-repair", 499, 60, "Troubleshooting visit for cooling, noise and common refrigerator issues.", "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80"),
                        ("Car Interior & Exterior Detail", "car-care", 1799, 180, "A careful interior and exterior refresh for everyday vehicles.", "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&auto=format&fit=crop&q=80"),
                    ],
                },
                {
                    "email": "handyman@gmail.com", "password": "provider123", "name": "Sanjay Varma",
                    "phone": "+919810000103", "business": "FixIt Home Solutions", "location": "Kochi - Palarivattom",
                    "bio": "Experienced home technician for plumbing, electrical checks and practical repairs.",
                    "experience": 9, "rating": "4.70",
                    "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                    "services": [
                        ("Tap & Pipe Leak Repair", "plumbing-care", 399, 60, "Inspection and repair of common tap, connector and visible pipe leaks.", "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80"),
                        ("Electrical Safety Check", "electrical-care", 599, 60, "A home visit to inspect common fixtures, switches and visible electrical concerns.", "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80"),
                        ("Washer Service Visit", "appliance-repair", 549, 60, "Initial troubleshooting for drainage, vibration and common washer issues.", "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&auto=format&fit=crop&q=80"),
                        ("Home Moving Assistance", "garden-moving", 999, 120, "Practical help packing, carrying and organizing household items for a local move.", "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&auto=format&fit=crop&q=80"),
                    ],
                },
                {
                    "email": "techsupport@gmail.com", "password": "provider123", "name": "Diya Thomas",
                    "phone": "+919810000104", "business": "PixelCraft Tech Assist", "location": "Kochi - Edappally",
                    "bio": "Patient tech support for laptops, home Wi-Fi and everyday connected devices.",
                    "experience": 5, "rating": "4.85",
                    "image": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
                    "services": [
                        ("Laptop Tune-up & Health Check", "tech-support", 699, 60, "Performance check, cleanup guidance, updates and device health review.", "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80"),
                        ("Home Wi-Fi Setup", "tech-support", 599, 60, "Router placement, Wi-Fi setup and connectivity troubleshooting.", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80"),
                        ("Phone Screen Repair Assessment", "appliance-repair", 399, 30, "Initial inspection for screen, charging and common phone hardware issues.", "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80"),
                        ("At-home Grooming Appointment", "beauty-wellness", 899, 60, "A convenient personal grooming appointment in the comfort of your home.", "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80"),
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
                for name, category_slug, price, duration, desc, img_url in p["services"]:
                    Service.objects.update_or_create(
                        provider=profile, name=name,
                        defaults={"category": categories[category_slug], "price": price,
                                  "duration_minutes": duration, "description": desc,
                                  "location": p["location"], "image_url": img_url,
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
