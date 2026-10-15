from django.core.management.base import BaseCommand
from datetime import time, date, timedelta
from apps.accounts.models import User, CustomerProfile, ProviderProfile
from apps.services.models import Category, Service
from apps.bookings.models import Availability, Booking, Review

class Command(BaseCommand):
    help = 'Seeds sample data for BookMyService platform'

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding...")

        # 1. Create Admin
        admin_user, created = User.objects.get_or_create(
            email='admin@bookmyservice.com',
            defaults={
                'name': 'System Administrator',
                'phone': '+919876543210',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created Admin: admin@bookmyservice.com (password: admin123)"))

        # 2. Create Demo Customer
        customer_user, created = User.objects.get_or_create(
            email='customer@bookmyservice.com',
            defaults={
                'name': 'Rahul Sharma',
                'phone': '+919876543211',
                'role': User.Role.CUSTOMER
            }
        )
        if created:
            customer_user.set_password('customer123')
            customer_user.save()
            CustomerProfile.objects.create(user=customer_user, address='MG Road, Flat 4B', city='Kochi')
            self.stdout.write(self.style.SUCCESS("Created Customer: customer@bookmyservice.com (password: customer123)"))

        # 3. Create Categories
        categories_data = [
            {'name': 'Laptop Repair', 'slug': 'laptop-repair', 'icon': 'bi-laptop', 'description': 'Hardware fixes, OS installation, motherboard and screen repairs.'},
            {'name': 'AC Service', 'slug': 'ac-service', 'icon': 'bi-snow', 'description': 'Deep cleaning, gas refill, repair and routine maintenance.'},
            {'name': 'Home Cleaning', 'slug': 'home-cleaning', 'icon': 'bi-house-heart', 'description': 'Deep home cleaning, kitchen & bathroom sanitation.'},
            {'name': 'Plumbing', 'slug': 'plumbing', 'icon': 'bi-wrench-adjustable', 'description': 'Leak detection, pipe repairs, faucet installation.'},
            {'name': 'Car Service', 'slug': 'car-service', 'icon': 'bi-car-front', 'description': 'Water wash, detailing, oil change and car inspection.'},
            {'name': 'Photography', 'slug': 'photography', 'icon': 'bi-camera', 'description': 'Event coverage, portraits, product and fashion photography.'},
            {'name': 'Electrical Service', 'slug': 'electrical-service', 'icon': 'bi-lightning-charge', 'description': 'Wiring, appliance setup, circuit breaker troubleshooting.'},
            {'name': 'Website Development', 'slug': 'website-development', 'icon': 'bi-code-slash', 'description': 'Full-stack web apps, e-commerce stores, custom portals.'},
        ]

        cat_objs = {}
        for c in categories_data:
            obj, _ = Category.objects.get_or_create(slug=c['slug'], defaults=c)
            cat_objs[c['slug']] = obj

        self.stdout.write(self.style.SUCCESS(f"Loaded {len(cat_objs)} categories."))

        # 4. Create Providers & Services
        providers_data = [
            {
                'email': 'apex.tech@bookmyservice.com',
                'name': 'Arun Kumar',
                'business_name': 'Apex Tech Repairs',
                'location': 'Kochi - Edappally',
                'bio': 'Certified hardware technician with 7+ years of experience repairing MacBooks, Windows laptops, and gaming rigs.',
                'experience': 7,
                'rating': 4.8,
                'services': [
                    {'name': 'Complete Laptop Diagnosis & Tune-Up', 'category': 'laptop-repair', 'price': 500, 'duration': 60, 'desc': 'Full hardware checkup, thermal paste replacement, and virus scan.'},
                    {'name': 'Screen & Keyboard Replacement', 'category': 'laptop-repair', 'price': 1200, 'duration': 90, 'desc': 'Original OEM replacement for broken screens and malfunctioning keyboards.'},
                    {'name': 'RAM & SSD Speed Upgrade', 'category': 'laptop-repair', 'price': 800, 'duration': 30, 'desc': 'Fast NVMe SSD installation and OS cloning for lightning fast boot speed.'},
                ]
            },
            {
                'email': 'coolbreeze@bookmyservice.com',
                'name': 'Muhammed Faisal',
                'business_name': 'CoolBreeze Air Systems',
                'location': 'Kochi - Kakkanad',
                'bio': 'Experienced HVAC specialists offering premier cooling solutions for residential and commercial spaces.',
                'experience': 8,
                'rating': 4.7,
                'services': [
                    {'name': 'Split AC Foam Jet Deep Cleaning', 'category': 'ac-service', 'price': 699, 'duration': 60, 'desc': 'High-pressure water & foam jet wash removing indoor fungal allergens.'},
                    {'name': 'AC Gas Leak Detection & Refill', 'category': 'ac-service', 'price': 1800, 'duration': 90, 'desc': 'Nitrogen pressure testing, brazing leak repair, and virgin refrigerant charging.'},
                    {'name': 'AC Installation / Uninstallation', 'category': 'ac-service', 'price': 1200, 'duration': 120, 'desc': 'Safe dismantling and wall mount installation with vacuum piping.'},
                ]
            },
            {
                'email': 'sparkle@bookmyservice.com',
                'name': 'Deepa Nair',
                'business_name': 'Sparkle Home Care',
                'location': 'Kochi - Marine Drive',
                'bio': 'Professional eco-friendly cleaning crews dedicated to spotless, sanitized homes.',
                'experience': 5,
                'rating': 4.9,
                'services': [
                    {'name': 'Full Home Deep Sanitization', 'category': 'home-cleaning', 'price': 2499, 'duration': 180, 'desc': 'Comprehensive scrubbing, steam sanitation, dusting, and floor buffing.'},
                    {'name': 'Kitchen Deep Degreasing', 'category': 'home-cleaning', 'price': 1100, 'duration': 90, 'desc': 'Removes stubborn oil grime from chimney, tile backsplash, and cabinets.'},
                ]
            },
            {
                'email': 'quickplumb@bookmyservice.com',
                'name': 'Suresh Babu',
                'business_name': 'QuickFix Plumbing Solutions',
                'location': 'Kochi - Palarivattom',
                'bio': 'Master plumber handling residential water line emergencies, faucet fits, and water tank pumps.',
                'experience': 10,
                'rating': 4.6,
                'services': [
                    {'name': 'Tap & Shower Leakage Repair', 'category': 'plumbing', 'price': 350, 'duration': 30, 'desc': 'Fix dripping taps, washer replacement, and angle valve corrections.'},
                    {'name': 'Drainage Unclogging & Jetting', 'category': 'plumbing', 'price': 650, 'duration': 60, 'desc': 'Heavy duty mechanical snake clearing choked drains and grease traps.'},
                ]
            }
        ]

        for p_data in providers_data:
            user, created = User.objects.get_or_create(
                email=p_data['email'],
                defaults={
                    'name': p_data['name'],
                    'phone': '+919876543299',
                    'role': User.Role.PROVIDER
                }
            )
            if created:
                user.set_password('provider123')
                user.save()

            profile, _ = ProviderProfile.objects.get_or_create(
                user=user,
                defaults={
                    'business_name': p_data['business_name'],
                    'location': p_data['location'],
                    'bio': p_data['bio'],
                    'experience_years': p_data['experience'],
                    'rating_cache': p_data['rating'],
                    'total_reviews': 12
                }
            )

            # Set weekly availability: Mon-Fri 09:00 - 18:00, Sat 10:00 - 15:00, Sun off
            for day in range(7):
                if day < 5:
                    Availability.objects.update_or_create(
                        provider=profile, day_of_week=day,
                        defaults={'start_time': time(9, 0), 'end_time': time(18, 0), 'is_available': True}
                    )
                elif day == 5:
                    Availability.objects.update_or_create(
                        provider=profile, day_of_week=day,
                        defaults={'start_time': time(10, 0), 'end_time': time(15, 0), 'is_available': True}
                    )
                else:
                    Availability.objects.update_or_create(
                        provider=profile, day_of_week=day,
                        defaults={'start_time': time(9, 0), 'end_time': time(17, 0), 'is_available': False}
                    )

            # Create services
            for s in p_data['services']:
                Service.objects.get_or_create(
                    provider=profile,
                    name=s['name'],
                    defaults={
                        'category': cat_objs[s['category']],
                        'price': s['price'],
                        'duration_minutes': s['duration'],
                        'description': s['desc'],
                        'location': p_data['location'],
                        'is_active': True
                    }
                )

        self.stdout.write(self.style.SUCCESS("All seed providers, services, and schedules successfully created!"))
