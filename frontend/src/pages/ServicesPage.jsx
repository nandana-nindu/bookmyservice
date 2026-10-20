import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import BookingModal from '../components/BookingModal';
import ServiceImage from '../components/ServiceImage';
import ProviderAvatar from '../components/ProviderAvatar';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [ordering, setOrdering] = useState('-created_at');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory, searchQuery, location, minPrice, maxPrice, minRating, ordering]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('q', searchQuery);
      if (location) params.append('location', location);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (minRating) params.append('min_rating', minRating);
      if (ordering) params.append('ordering', ordering);

      const res = await api.get(`/services/?${params.toString()}`);
      setServices(res.data || []);
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setOrdering('-created_at');
    setSearchParams({});
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Browse & Book Services</h2>
        <p className="text-secondary small">Filter certified professionals by category, pricing, location, and rating</p>
      </div>

      <div className="row g-4">
        {/* Filters Sidebar */}
        <div className="col-lg-3">
          <div className="bg-white p-4 rounded-4 border shadow-sm services-filter-panel">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-funnel-fill text-primary me-2"></i> Filters
              </h5>
              <button className="btn btn-sm btn-link text-decoration-none p-0 text-muted" onClick={clearFilters}>
                Reset All
              </button>
            </div>

            {/* Keyword Search */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Search Keyword</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. AC, Screen, Tap..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Category</label>
              <select
                className="form-select form-select-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} ({c.services_count})
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Location</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Kochi, Kakkanad..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Price Range Filter */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Price Range (₹)</label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Minimum Rating</label>
              <select
                className="form-select form-select-sm"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">Any Rating</option>
                <option value="4.5">★ 4.5 & above</option>
                <option value="4.0">★ 4.0 & above</option>
                <option value="3.5">★ 3.5 & above</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services List Grid */}
        <div className="col-lg-9">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="text-secondary small">
              Found <strong>{services.length}</strong> available services
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-secondary">Sort by:</span>
              <select
                className="form-select form-select-sm w-auto"
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
              >
                <option value="-created_at">Newest First</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-provider__rating_cache">Highest Rated Provider</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white p-5 rounded-4 text-center border shadow-sm">
              <i className="bi bi-search fs-1 text-muted d-block mb-3"></i>
              <h5 className="fw-bold">No services match your filters</h5>
              <p className="text-muted small">Try broadening your search or resetting the filters.</p>
              <button className="btn btn-outline-primary btn-sm rounded-pill px-4" onClick={clearFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {services.map((service) => (
                <div className="col-md-6" key={service.id}>
                  <div className="service-card p-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold px-2.5 py-1.5 rounded-pill">
                        {service.category_name}
                      </span>
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-clock me-1 text-secondary"></i> {service.duration_minutes} Mins
                      </span>
                    </div>

                    <ServiceImage
                      src={service.image || service.image_url}
                      alt={service.name}
                      categorySlug={service.category_slug}
                    />
                    <h5 className="fw-bold mb-2">{service.name}</h5>
                    <p className="text-muted small mb-3 flex-grow-1" style={{ minHeight: '40px' }}>
                      {service.description}
                    </p>

                    <div className="p-3 bg-light rounded-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold small text-dark d-flex align-items-center">
                            <ProviderAvatar
                              src={service.provider_details?.profile_image}
                              name={service.provider_details?.business_name}
                              size={28}
                            />
                            {service.provider_details?.business_name}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-geo-alt-fill text-danger me-1"></i> {service.location}
                          </div>
                        </div>
                        <div className="text-warning fw-bold small">
                          <i className="bi bi-star-fill me-1"></i>
                          {service.provider_details?.rating_cache || '5.0'}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2">
                      <div>
                        <span className="text-muted small">Price</span>
                        <div className="fw-bold text-primary fs-4">₹{service.price}</div>
                      </div>
                      <button
                        className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm"
                        onClick={() => setSelectedService(service)}
                      >
                        Book Time Slot
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
