# BookMyService — Service Booking and Management Platform

BookMyService is a full-stack on-demand service booking and provider operations platform engineered using Django REST Framework, React, PostgreSQL, and Vite. The platform addresses core scheduling challenges in on-demand service marketplaces, including high-concurrency slot allocation, race-condition mitigation, deterministic state machine lifecycles, and strict policy enforcement for booking modifications.

---

## Deployment and Repositories

- **Live Application (Frontend)**: [https://bookmyservice-ten.vercel.app](https://bookmyservice-ten.vercel.app)
- **API Service (Backend)**: [https://bookmyservice-api-yu32.onrender.com](https://bookmyservice-api-yu32.onrender.com)
- **Source Code Repository**: [https://github.com/nandana-nindu/bookmyservice](https://github.com/nandana-nindu/bookmyservice)

---

## Architectural Overview

```
                      +-----------------------------+
                      |   React 18 SPA (Vite)       |
                      |   Client-Side Application   |
                      +--------------+--------------+
                                     |
                                     | HTTPS / JSON (JWT Auth)
                                     v
                      +-----------------------------+
                      | Django REST Framework API   |
                      | WSGI / Gunicorn             |
                      +--------------+--------------+
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
      +---------------------------+     +---------------------------+
      | PostgreSQL (Production)   |     | Transaction & Lock Engine |
      | - btree_gist Exclusion    |     | - select_for_update()     |
      | - Foreign Key Integrity   |     | - transaction.atomic()    |
      +---------------------------+     +---------------------------+
```

### Core Technologies

- **Backend**: Python 3.12, Django 5.2, Django REST Framework, SimpleJWT
- **Database**: PostgreSQL with `btree_gist` extension (SQLite supported for development)
- **Frontend**: React 18, Vite 8, Bootstrap 5, Axios
- **Deployment**: Vercel (Single-Page Application), Render (Containerized Web Service and Managed Database)
- **Compliance**: Conventional client-server web architecture without third-party AI service runtime dependencies

---

## System Capabilities by User Persona

### 1. Customer
- Multi-parameter service discovery filtering by category, price threshold, geographical location, provider rating, and text queries.
- Dynamic slot computation calculated from provider weekly operating schedules, appointment duration (30 to 180 minutes), and existing active bookings.
- Customer dashboard for tracking active, past, and cancelled service orders.
- Self-service cancellation and reschedule actions governed by a 2-hour pre-service cutoff window.
- Post-service rating and review submissions that dynamically recalculate provider rating averages.

### 2. Service Provider
- Business profile configuration, operating location details, and bio management.
- Service catalog operations: defining service descriptions, tier pricing, and duration intervals.
- Working hour definitions: granular daily schedules across Monday through Sunday.
- Booking execution workflow: structured lifecycle actions (`Accept`, `Reject`, `Start Service`, `Complete Service`).

### 3. Platform Administrator
- System telemetry: aggregate counts of customers, providers, published services, and order status distributions.
- Financial metrics: gross completed revenue tracking.
- Account access governance: immediate activation or suspension of user accounts.

---

## Concurrency Control and Race Condition Prevention

### Concurrency Challenge
When multiple consumers attempt to reserve the same provider slot concurrently, naive database implementations produce double bookings due to race conditions during interval read-and-insert cycles.

### Engineering Resolution
BookMyService implements a layered concurrency defense:

1. **Transaction Isolation**: Slot allocation is wrapped in `@transaction.atomic`.
2. **Pessimistic Row Locking**: Evaluates provider records using `select_for_update()`, serializing concurrent allocation requests for the target provider.
3. **Interval Collision Logic**: Queries active reservations (`PENDING`, `CONFIRMED`, `IN_PROGRESS`) where:
   $$\text{requested\_start} < \text{existing\_end} \quad \land \quad \text{requested\_end} > \text{existing\_start}$$
4. **Database-Level Constraint**: In PostgreSQL, an exclusion constraint (`prevent_overlapping_active_provider_bookings`) using the `btree_gist` index validates time intervals at the engine level, guaranteeing slot uniqueness even across independent application threads.

---

## Booking State Machine Lifecycle

State transitions follow a strictly defined lifecycle. Out-of-order transitions are rejected by validation logic.

```
       [ PENDING ]
          |     \
          |      +-----> [ REJECTED ] (Terminal)
          v
     [ CONFIRMED ]
          |     \
          |      +-----> [ CANCELLED ] (Permitted up to 2 hours prior)
          v
    [ IN_PROGRESS ]
          |
          v
     [ COMPLETED ] (Terminal -> Review submission enabled)
```

### Policy Rules
- **Cancellation Cutoff**: Bookings can only be cancelled or rescheduled at least 2 hours prior to the scheduled start time. Within 2 hours, requests return an HTTP 400 error.
- **Resource Recovery**: Cancelled or rescheduled bookings immediately release their time windows for other customers.

---

## Local Development Setup

### System Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher with npm

### 1. Repository Setup
```bash
git clone https://github.com/nandana-nindu/bookmyservice.git
cd bookmyservice
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The frontend application runs on `http://127.0.0.1:5173` with local API requests proxied to port `8000`.

---

## Automated Concurrency and Integration Testing

The test suite validates data integrity, transition guards, and double-booking prevention.

```bash
cd backend
python manage.py test apps.bookings
```

### Targeted Test Scenarios
- Concurrent booking collision rejection under lock contention
- Disallowed state transitions (e.g., `PENDING` directly to `COMPLETED`)
- Rejection of cancellations requested within the 2-hour window
- Availability generation accuracy based on provider schedule definitions

---

## Primary API Endpoints

### Authentication and Accounts
| Method | Route | Authorization | Function |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Account creation for customer or provider |
| `POST` | `/api/auth/login/` | Public | JWT access and refresh token generation |
| `GET` / `PUT` | `/api/auth/profile/` | Authenticated | Profile retrieval and updates |
| `GET` | `/api/auth/admin/users/` | Admin | System user inventory |
| `POST` | `/api/auth/admin/users/<id>/toggle-status/` | Admin | Account activation toggle |

### Services and Categories
| Method | Route | Authorization | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories/` | Public | Catalog categories with service counts |
| `GET` | `/api/services/` | Public | Filtered service listings |
| `GET` / `POST` | `/api/services/provider/` | Provider | Provider service management |

### Bookings and Scheduling
| Method | Route | Authorization | Function |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/slots/` | Public | Slot calculation for target date |
| `POST` | `/api/bookings/` | Customer | Booking reservation with pessimistic lock |
| `GET` | `/api/bookings/my-bookings/` | Customer | Order history for logged-in customer |
| `POST` | `/api/bookings/<id>/cancel/` | Authenticated | Cancellation with 2-hour policy check |
| `POST` | `/api/bookings/<id>/reschedule/` | Customer | Atomic appointment rescheduling |
| `PATCH` | `/api/bookings/<id>/status/` | Provider | Lifecycle status advancement |
| `GET` / `POST` | `/api/bookings/availability/` | Provider | Weekly working shift definitions |
| `GET` | `/api/bookings/admin/stats/` | Admin | Summary telemetry and revenue metrics |

---

## Production Configuration Guidelines

Production deployments should configure the following environment parameters:

- `DJANGO_DEBUG`: Set to `False`.
- `DJANGO_SECRET_KEY`: High-entropy production key.
- `DATABASE_URL`: Connection string to managed PostgreSQL instance.
- `DJANGO_ALLOWED_HOSTS`: Comma-separated list of permitted API host domains.
- `DJANGO_CORS_ALLOWED_ORIGINS`: Origins permitted for Cross-Origin requests.
- `VITE_API_URL`: Fully qualified base URL pointing to the deployed backend service.
