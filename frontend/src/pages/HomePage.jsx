import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const [catsRes, servsRes] = await Promise.all([
        api.get('/categories/'),
        api.get('/services/')
      ]);
      setCategories(catsRes.data || []);
      setFeaturedServices(servsRes.data?.slice(0, 6) || []);
    } catch (err) {
      console.error('Failed to fetch home data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/services');
    }
  };

  const handleQuickLogin = async (email, password) => {
    try {
      await login(email, password);
    } catch (e) {
      alert('Login failed. Please check backend connection.');
    }
  };

  return (
    <div className="container py-4">
      {/* Hero Section */}
      <div className="hero-gradient mb-5 shadow-lg">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <span className="badge bg-primary px-3 py-2 rounded-pill mb-3">
              <i className="bi bi-shield-check me-1"></i> Verified Providers & Real-Time Booking
            </span>
            <h1 className="display-4 fw-extrabold mb-3 text-white">
              Reliable Home & Tech Services, Scheduled in Minutes.
            </h1>
            <p className="lead text-light mb-4 opacity-75">
              Discover verified local technicians, view real-time availability slots, and book guaranteed appointments without the hassle of double bookings.
            </p>

            <form onSubmit={handleSearchSubmit} className="d-flex gap-2 bg-white p-2 rounded-pill shadow-sm">
              <input
                type="text"
                className="form-control border-0 rounded-pill ps-3 shadow-none"
                placeholder="Search laptop repair, AC deep clean, plumbing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">
                <i className="bi bi-search me-1"></i> Search
              </button>
            </form>
          </div>

          <div className="col-lg-5 d-none d-lg-block text-center">
            <div className="bg-white bg-opacity-10 p-4 rounded-4 backdrop-blur border border-white border-opacity-10 text-start">
              <h5 className="text-white fw-bold mb-3">⚡ Quick Assessment Demo Logins</h5>
              <p className="text-light small opacity-75 mb-3">
                Click any role below to instantly log in and experience the respective capabilities:
              </p>
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-light btn-sm text-start py-2 px-3 rounded-3"
                  onClick={() => handleQuickLogin('customer@bookmyservice.com', 'customer123')}
                >
                  <i className="bi bi-person-fill text-primary me-2"></i>
                  <strong>Customer:</strong> Rahul Sharma (MG Road, Kochi)
                </button>
                <button
                  className="btn btn-outline-light btn-sm text-start py-2 px-3 rounded-3"
                  onClick={() => handleQuickLogin('apex.tech@bookmyservice.com', 'provider123')}
                >
                  <i className="bi bi-tools text-success me-2"></i>
                  <strong>Provider:</strong> Apex Tech Repairs (Laptop Specialist)
                </button>
                <button
                  className="btn btn-outline-light btn-sm text-start py-2 px-3 rounded-3"
                  onClick={() => handleQuickLogin('admin@bookmyservice.com', 'admin123')}
                >
                  <i className="bi bi-shield-lock-fill text-danger me-2"></i>
                  <strong>Admin:</strong> Platform Administrator Console
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Slider / Grid */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">Explore Categories</h3>
            <p className="text-muted small mb-0">Browse certified specialists by domain</p>
          </div>
          <Link to="/services" className="text-primary text-decoration-none fw-semibold">
            View All Services <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/services?category=${cat.slug}`}
              className="category-pill"
            >
              <i className={`bi ${cat.icon} text-primary`}></i>
              <span>{cat.name}</span>
              <span className="badge bg-light text-dark rounded-pill ms-1">{cat.services_count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Services Grid */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">Featured Services</h3>
            <p className="text-muted small mb-0">Top-rated services available for booking today</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="row g-4">
            {featuredServices.map((service) => (
              <div className="col-md-6 col-lg-4" key={service.id}>
                <div className="service-card p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2.5 py-1.5 rounded-pill">
                      {service.category_name}
                    </span>
                    <span className="badge bg-light text-dark border">
                      <i className="bi bi-clock me-1 text-secondary"></i> {service.duration_minutes} Mins
                    </span>
                  </div>

                  <h5 className="fw-bold mb-2">{service.name}</h5>
                  <p className="text-muted small mb-3 flex-grow-1" style={{ minHeight: '40px' }}>
                    {service.description.length > 85 ? service.description.slice(0, 85) + '...' : service.description}
                  </p>

                  <div className="pt-3 border-top mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <div className="fw-semibold small text-dark">{service.provider_details?.business_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-geo-alt-fill text-danger me-1"></i> {service.location}
                        </div>
                      </div>
                      <div className="text-warning fw-bold small">
                        <i className="bi bi-star-fill me-1"></i>
                        {service.provider_details?.rating_cache || '5.0'}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="text-muted small">Price</span>
                        <div className="fw-bold text-primary fs-5">₹{service.price}</div>
                      </div>
                      <button
                        className="btn btn-primary rounded-pill px-4 fw-semibold"
                        onClick={() => setSelectedService(service)}
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it Works Banner */}
      <div className="bg-white p-5 rounded-4 border shadow-sm my-5">
        <div className="text-center mb-5">
          <span className="badge bg-light text-primary border px-3 py-1 rounded-pill fw-semibold mb-2">Seamless Experience</span>
          <h2 className="fw-bold">How BookMyService Works</h2>
        </div>

        <div className="row g-4 text-center">
          <div className="col-md-4">
            <div className="stat-icon bg-primary bg-opacity-10 text-primary mx-auto mb-3">
              <i className="bi bi-search fs-3"></i>
            </div>
            <h5 className="fw-bold">1. Find Your Service</h5>
            <p className="text-muted small">
              Filter certified providers by category, pricing, customer reviews, and proximity.
            </p>
          </div>

          <div className="col-md-4">
            <div className="stat-icon bg-success bg-opacity-10 text-success mx-auto mb-3">
              <i className="bi bi-clock-history fs-3"></i>
            </div>
            <h5 className="fw-bold">2. Select Real-Time Slot</h5>
            <p className="text-muted small">
              View live availability calculated directly from provider schedules and book without overlap.
            </p>
          </div>

          <div className="col-md-4">
            <div className="stat-icon bg-info bg-opacity-10 text-info mx-auto mb-3">
              <i className="bi bi-patch-check fs-3"></i>
            </div>
            <h5 className="fw-bold">3. Get Work Done</h5>
            <p className="text-muted small">
              Track status in real-time, reschedule if needed with 2-hour window, and review the technician.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          service={selectedService}
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          onSuccess={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}
