# 🛠️ BookMyService — Service Booking & Management Platform

A robust, full-stack on-demand service booking and provider management platform built with **Django REST Framework**, **React**, **Bootstrap 5**, and **PostgreSQL**.

Repository: [https://github.com/nandana-nindu/bookmyservice](https://github.com/nandana-nindu/bookmyservice)

---

## 🌟 Executive Overview & Key Features

BookMyService connects customers seeking home and tech services with certified local service providers. It is engineered with a strict focus on data integrity, state-machine transitions, and race-condition-proof appointment scheduling.

### 👥 Primary User Roles & Capabilities
1. **Customer**:
   - Discover, search, and filter services across categories, price range, location, and ratings.
   - Real-time time slot selector dynamically generated from provider operating schedules.
   - Manage active and historical bookings.
   - **Cancellation & Rescheduling Engine**: Governed by the strict **2-Hour Policy** (freeing slots automatically).
   - Review and rate completed services (1–5 stars with comments).
2. **Service Provider**:
   - Register and manage business profile, location, and verified status.
   - Manage catalog of services with custom durations (30 min, 60 min, 90 min, 120 min) and pricing.
   - Configure weekly working hours and operating shifts (Mon–Sun).
   - Booking Kanban workflow: `Accept`, `Reject`, `Start Service`, `Complete Service`.
3. **Administrator**:
   - Real-time platform telemetry: Total Customers, Providers, Services, Completed Revenue, and Booking Status Distribution.
   - Account governance: Instant activation/deactivation of platform users.

---

## 🔒 Assessment Core Challenge: Double Booking Prevention (15% Weight)

When multiple customers attempt to book the exact same time slot simultaneously, traditional systems suffer from race conditions leading to inconsistent state. BookMyService solves this through a multi-tier defense:

```
[Customer A & Customer B]
           │ (Simultaneous Requests for 10:00 AM Slot)
           ▼
[Django Transaction Layer: transaction.atomic()]
           │
           ▼
[Pessimistic Row-Level Lock: select_for_update()]
           │
           ├─► Customer A acquires lock first:
           │     1. Validates no active overlapping bookings
           │     2. Validates provider working hours
           │     3. Inserts booking entry (Status: PENDING)
           │     4. Commits transaction & releases lock
           │
           └─► Customer B acquires lock next:
                 1. Evaluates overlapping active bookings
                 2. Detects collision created by Customer A
                 3. Rolls back transaction
                 4. Returns HTTP 400: "This time slot has just been booked by another customer."
```

### Business Logic Safeguards:
- **Pessimistic Locking**: In `apps.bookings.services.create_booking_with_lock`, queries use `.select_for_update()` inside `@transaction.atomic`.
- **Database Indexing**: Composite indexes on `(provider_id, booking_date, status)` optimize concurrent lookup speed.
- **Overlapping Range Verification**: Validates `(requested_start < existing_end AND requested_end > existing_start)`.

---

## 🔄 Booking Status Flow & State Machine

Status transitions strictly enforce valid business lifecycle steps:

```
                  ┌──────────────────────┐
                  │       PENDING        │
                  └──────────┬───────────┘
                    ▲        │        ▲
   (Customer Cancel)│        │        │(Provider Reject)
                    ▼        ▼        ▼
               CANCELLED  CONFIRMED  REJECTED
                    ▲        │
   (Customer Cancel)│        │
                    ▼        ▼
               CANCELLED IN_PROGRESS
                             │
                             ▼
                         COMPLETED
                             │
                             ▼
                       (Leave Review)
```

- **Invalid Transitions Blocked**: Direct jump from `PENDING` to `COMPLETED` or modifying `CANCELLED`/`REJECTED` bookings raises validation errors.
- **2-Hour Cancellation Rule**: If `scheduled_time - now < 2 hours`, cancellation and rescheduling are permanently blocked by application logic.

---

## 🏛️ Technical Architecture

- **Backend**: Python 3.12, Django 5.2, Django REST Framework, SimpleJWT (JWT Authentication).
- **Database**: PostgreSQL / SQLite (with WAL mode & row-level concurrency).
- **Frontend**: React 18, Vite 8, Bootstrap 5, Bootstrap Icons, Axios.
- **No AI-Powered Features in Core Application**: Compliant with assessment guidelines (conventional web application architecture).

---

## ⚡ Default Demo Credentials

For quick evaluation, pre-seeded accounts are available directly via the **Demo Quick-Logins** button in the navbar:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@bookmyservice.com` | `admin123` | Full dashboard metrics & account toggle |
| **Service Provider** | `apex.tech@bookmyservice.com` | `provider123` | Apex Tech Repairs (Laptop Specialist) |
| **Service Provider** | `coolbreeze@bookmyservice.com` | `provider123` | CoolBreeze AC Systems |
| **Customer (Nandana)** | `nandana@bookmyservice.com` | `nandana123` | Nandana Nindu (Marine Drive, Kochi) |
| **Customer** | `customer@bookmyservice.com` | `customer123` | Rahul Sharma (MG Road, Kochi) |

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/nandana-nindu/bookmyservice.git
cd bookmyservice
```

### 2. Backend Setup (Django REST Framework)
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data      # Populates categories, providers, services, & schedules
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup (React + Vite)
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.

---

## 🧪 Running Automated Concurrency Tests

The test suite validates double-booking prevention, 2-hour cancellation rules, and valid status transitions:

```bash
cd backend
venv\Scripts\activate
python manage.py test apps.bookings
```

Output:
```text
Creating test database for alias 'default'...
....
----------------------------------------------------------------------
Ran 4 tests in 6.152s

OK
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Register customer or provider |
| `POST` | `/api/auth/login/` | Public | Obtain JWT token pair |
| `GET` | `/api/categories/` | Public | List all service categories |
| `GET` | `/api/services/` | Public | Filtered service catalog |
| `GET` | `/api/bookings/slots/` | Public | Get real-time available time slots |
| `POST` | `/api/bookings/` | Customer | Book a slot with atomic concurrency lock |
| `GET` | `/api/bookings/my-bookings/` | Customer | View customer bookings |
| `POST` | `/api/bookings/<id>/cancel/` | Customer/Provider | Cancel booking (enforces 2-hr policy) |
| `POST` | `/api/bookings/<id>/reschedule/` | Customer | Reschedule booking atomically |
| `POST` | `/api/bookings/<id>/review/` | Customer | Review completed service |
| `GET` | `/api/bookings/provider-bookings/`| Provider | View incoming customer bookings |
| `PATCH`| `/api/bookings/<id>/status/` | Provider | Accept, reject, start, complete |
| `GET` | `/api/bookings/availability/` | Provider | Fetch weekly working hours |
| `POST` | `/api/bookings/availability/` | Provider | Bulk update weekly availability |
| `GET` | `/api/bookings/admin/stats/` | Admin | Real-time platform metrics & revenue |
| `POST` | `/api/auth/admin/users/<id>/toggle-status/` | Admin | Activate or deactivate account |

## Environment configuration and production safety

Backend settings are environment-driven. For local development, copy `backend/.env.example` to `backend/.env` and keep `DJANGO_DEBUG=True` only on your development machine. For deployment, set `DJANGO_DEBUG=False`, a long random `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` to the deployed API hostnames, and `DJANGO_CORS_ALLOWED_ORIGINS` to the exact frontend origins. Set `DATABASE_URL` to PostgreSQL for production booking concurrency guarantees. Never commit `backend/.env` or real credentials.

For the PostgreSQL overlap constraint, apply migrations after installing the `btree_gist` extension permission (migration 0003 creates the extension if the database user is permitted). SQLite is useful for local development but does not support row-level `SELECT FOR UPDATE`; use PostgreSQL for the concurrent booking test and production.

Service images are uploaded through the provider's **My Services** form and are stored under `MEDIA_ROOT/service_images/`. Provider profile images and customer profile editing are available from their respective dashboards.
