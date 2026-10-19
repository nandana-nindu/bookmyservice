import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProviderDashboard() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings'); // bookings | services | schedule | profile
  const [providerProfile, setProviderProfile] = useState({ name: '', phone: '', business_name: '', bio: '', location: '', experience_years: 1, profile_image: null });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Services State
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddService, setShowAddService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    price: '',
    duration_minutes: 60,
    description: '',
    location: '',
    image: null,
  });

  // Schedule State
  const [schedule, setSchedule] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchCategories();
    fetchSchedule();
    fetchProviderProfile();
  }, [statusFilter]);

  const fetchProviderProfile = async () => {
    try {
      const res = await api.get('/auth/profile/');
      const current = res.data || {};
      const profile = current.provider_profile || {};
      setProviderProfile({
        name: current.name || '',
        phone: current.phone || '',
        business_name: profile.business_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        experience_years: profile.experience_years ?? 1,
        profile_image: profile.profile_image || null,
      });
      setProfileImagePreview(profile.profile_image || '');
      updateUser(current);
    } catch (err) {
      console.error('Failed to load provider profile:', err);
    }
  };

  const handleProfileFieldChange = (e) => {
    const { name, value } = e.target;
    setProviderProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAlertMsg({ text: 'Please select an image file.', type: 'danger' });
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAlertMsg({ text: 'Image must be 5 MB or smaller.', type: 'danger' });
      e.target.value = '';
      return;
    }
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const form = new FormData();
      form.append('name', providerProfile.name);
      form.append('phone', providerProfile.phone);
      form.append('business_name', providerProfile.business_name);
      form.append('bio', providerProfile.bio);
      form.append('location', providerProfile.location);
      form.append('experience_years', String(providerProfile.experience_years || 0));
      if (profileImageFile) form.append('profile_image', profileImageFile);
      const res = await api.patch('/auth/profile/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data);
      const profile = res.data?.provider_profile || {};
      setProviderProfile(prev => ({ ...prev, profile_image: profile.profile_image || null }));
      setProfileImagePreview(profile.profile_image || '');
      setProfileImageFile(null);
      setAlertMsg({ text: 'Provider profile updated successfully.', type: 'success' });
    } catch (err) {
      const data = err.response?.data;
      const message = typeof data === 'string' ? data : (data?.detail || Object.entries(data || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' ') || 'Failed to update provider profile.');
      setAlertMsg({ text: message, type: 'danger' });
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const url = statusFilter ? `/bookings/provider-bookings/?status=${statusFilter}` : '/bookings/provider-bookings/';
      const res = await api.get(url);
      setBookings(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/provider/services/');
      setServices(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data || []);
      if (res.data?.length > 0 && !newService.category) {
        setNewService(prev => ({ ...prev, category: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/bookings/availability/');
      setSchedule(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status/`, { status: newStatus });
      setAlertMsg({ text: res.data.message, type: 'success' });
      fetchBookings();
    } catch (err) {
      setAlertMsg({ text: err.response?.data?.error || 'Failed to update booking status.', type: 'danger' });
    }
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData();
      Object.entries(newService).forEach(([key, value]) => { if (value !== null && value !== '') form.append(key, value); });
      if (editingServiceId) {
        await api.patch(`/provider/services/${editingServiceId}/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAlertMsg({ text: 'Service updated successfully!', type: 'success' });
      } else {
        await api.post('/provider/services/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAlertMsg({ text: 'New service offering added successfully!', type: 'success' });
      }
      setShowAddService(false);
      setEditingServiceId(null);
      setNewService({ name: '', category: categories[0]?.id || '', price: '', duration_minutes: 60, description: '', location: '', image: null });
      fetchServices();
    } catch (err) {
      setAlertMsg({ text: err.response?.data?.error || 'Failed to add service.', type: 'danger' });
    }
  };

  const handleScheduleChange = (dayIndex, field, value) => {
    setSchedule(prev => prev.map((item, idx) => {
      if (idx === dayIndex) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await api.post('/bookings/availability/', { schedules: schedule });
      setAlertMsg({ text: 'Weekly availability schedule saved!', type: 'success' });
    } catch (err) {
      setAlertMsg({ text: 'Failed to update schedule.', type: 'danger' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'PENDING': 'badge-pending',
      'CONFIRMED': 'badge-confirmed',
      'IN_PROGRESS': 'badge-in_progress',
      'COMPLETED': 'badge-completed',
      'CANCELLED': 'badge-cancelled',
      'REJECTED': 'badge-rejected',
    };
    return <span className={`badge-status ${map[status] || 'bg-secondary'}`}>{status}</span>;
  };

  return (
    <div className="container py-4">
      {/* Top Header & Stats */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Service Provider Hub</h2>
          <p className="text-secondary small mb-0">
            Business: <strong>{user?.provider_profile?.business_name || user?.name}</strong> • Location: <strong>{user?.provider_profile?.location}</strong>
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          {user?.provider_profile?.profile_image ? (
            <img src={user.provider_profile.profile_image} alt="Provider profile" className="rounded-circle border" style={{ width: 54, height: 54, objectFit: 'cover' }} />
          ) : (
            <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold" style={{ width: 54, height: 54, fontSize: 20 }}>
              {(user?.provider_profile?.business_name || user?.name || 'P').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold">
            <i className="bi bi-star-fill me-1"></i> {user?.provider_profile?.rating_cache || '5.0'} Rating
          </span>
        </div>
      </div>

      {alertMsg.text && (
        <div className={`alert alert-${alertMsg.type} alert-dismissible fade show rounded-3 shadow-sm`} role="alert">
          {alertMsg.text}
          <button type="button" className="btn-close" onClick={() => setAlertMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 bg-white p-2 rounded-4 border shadow-sm">
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-semibold ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <i className="bi bi-calendar2-range me-2"></i> Bookings Management ({bookings.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-semibold ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <i className="bi bi-tools me-2"></i> My Service Offerings ({services.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-semibold ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <i className="bi bi-clock-history me-2"></i> Weekly Availability Schedule
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link rounded-pill px-4 fw-semibold ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="bi bi-person-gear me-2"></i> Provider Profile
          </button>
        </li>
      </ul>

      {/* TAB 1: BOOKINGS MANAGEMENT */}
      {activeTab === 'bookings' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
            <span className="fw-bold small text-secondary text-uppercase">Customer Requests</span>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-secondary">Filter Status:</span>
              <select
                className="form-select form-select-sm w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loadingBookings ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              No customer bookings found for this filter.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Booking #</th>
                    <th>Customer Info</th>
                    <th>Service</th>
                    <th>Date & Slot</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="ps-4 fw-semibold text-secondary">#{b.id}</td>
                      <td>
                        <div className="fw-bold text-dark">{b.customer_name}</div>
                        <div className="small text-secondary">
                          <i className="bi bi-telephone-fill me-1"></i> {b.customer_phone || 'N/A'}
                        </div>
                        {b.notes && (
                          <div className="small text-info fst-italic">"{b.notes}"</div>
                        )}
                      </td>
                      <td className="fw-semibold text-dark">{b.service_details?.name}</td>
                      <td>
                        <div>{b.booking_date}</div>
                        <span className="badge bg-light text-dark border">{b.start_time} - {b.end_time}</span>
                      </td>
                      <td className="fw-bold text-success">₹{b.total_price}</td>
                      <td>{getStatusBadge(b.status)}</td>
                      <td className="text-end pe-4">
                        {/* State machine actions */}
                        {b.status === 'PENDING' && (
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              className="btn btn-success btn-sm rounded-pill px-3 fw-bold"
                              onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
                            >
                              <i className="bi bi-check-lg me-1"></i> Accept
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm rounded-pill px-3"
                              onClick={() => handleStatusChange(b.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <button
                            className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold shadow-sm"
                            onClick={() => handleStatusChange(b.id, 'IN_PROGRESS')}
                          >
                            <i className="bi bi-play-fill me-1"></i> Start Service
                          </button>
                        )}

                        {b.status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn-warning text-dark btn-sm rounded-pill px-3 fw-bold shadow-sm"
                            onClick={() => handleStatusChange(b.id, 'COMPLETED')}
                          >
                            <i className="bi bi-check2-circle me-1"></i> Mark Completed
                          </button>
                        )}

                        {b.status === 'COMPLETED' && (
                          <span className="badge bg-light text-success border px-3 py-2 rounded-pill">
                            <i className="bi bi-patch-check-fill me-1"></i> Fulfilled
                          </span>
                        )}

                        {['CANCELLED', 'REJECTED'].includes(b.status) && (
                          <span className="text-muted small">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SERVICES */}
      {activeTab === 'services' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Active Catalog Offerings</h5>
            <button className="btn btn-primary rounded-pill px-4" onClick={() => { setEditingServiceId(null); setNewService({ name: '', category: categories[0]?.id || '', price: '', duration_minutes: 60, description: '', location: '', image: null }); setShowAddService(true); }}>
              <i className="bi bi-plus-circle me-1"></i> Add New Service
            </button>
          </div>

          <div className="row g-4">
            {services.map((s) => (
              <div className="col-md-6 col-lg-4" key={s.id}>
                <div className="service-card p-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill">{s.category_name}</span>
                    <span className="badge bg-light text-dark border">{s.duration_minutes} Mins</span>
                  </div>
                  <h5 className="fw-bold mb-2">{s.name}</h5>
                  <p className="text-secondary small mb-3">{s.description}</p>
                  <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center gap-2">
                    <span className="fw-bold fs-5 text-primary">₹{s.price}</span>
                    <span className={`badge ${s.is_active ? 'bg-success' : 'bg-secondary'}`}>{s.is_active ? 'Active' : 'Disabled'}</span>
                    <button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => { setEditingServiceId(s.id); setNewService({ name:s.name, category:s.category, price:String(s.price), duration_minutes:s.duration_minutes, description:s.description, location:s.location || '', image:null }); setShowAddService(true); }}>Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULE CONFIGURATION */}
      {activeTab === 'schedule' && (
        <div className="card border-0 shadow-sm rounded-4 p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="fw-bold mb-1">Weekly Operating Schedule</h5>
              <p className="text-secondary small mb-0">
                Define the hours during which customers can book slots with your team.
              </p>
            </div>
            <button
              className="btn btn-primary rounded-pill px-4 fw-bold"
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
            >
              {savingSchedule ? 'Saving...' : 'Save Schedule Changes'}
            </button>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '25%' }}>Day of Week</th>
                  <th style={{ width: '25%' }}>Availability Status</th>
                  <th style={{ width: '25%' }}>Shift Start</th>
                  <th style={{ width: '25%' }}>Shift End</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="fw-bold">{item.day_name || `Day ${item.day_of_week}`}</td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={item.is_available}
                          onChange={(e) => handleScheduleChange(idx, 'is_available', e.target.checked)}
                        />
                        <label className="form-check-label small fw-semibold">
                          {item.is_available ? 'Open for Bookings' : 'Closed'}
                        </label>
                      </div>
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control form-control-sm w-75"
                        disabled={!item.is_available}
                        value={item.start_time?.slice(0, 5) || '09:00'}
                        onChange={(e) => handleScheduleChange(idx, 'start_time', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control form-control-sm w-75"
                        disabled={!item.is_available}
                        value={item.end_time?.slice(0, 5) || '17:00'}
                        onChange={(e) => handleScheduleChange(idx, 'end_time', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROVIDER PROFILE */}
      {activeTab === 'profile' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="card-header bg-white border-bottom p-4">
            <h4 className="fw-bold mb-1">Provider profile</h4>
            <p className="text-secondary small mb-0">Manage the public business details customers see when browsing your services.</p>
          </div>
          <form onSubmit={handleProfileSubmit}>
            <div className="card-body p-4">
              <div className="row g-4 align-items-start">
                <div className="col-md-4 text-center">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Provider profile preview" className="rounded-circle border shadow-sm mb-3" style={{ width: 160, height: 160, objectFit: 'cover' }} />
                  ) : (
                    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 160, height: 160, fontSize: 56 }}>
                      <i className="bi bi-person-badge"></i>
                    </div>
                  )}
                  <label className="form-label fw-semibold d-block">Profile image</label>
                  <input className="form-control" type="file" accept="image/*" onChange={handleProfileImageChange} />
                  <div className="form-text">JPG, PNG or another browser-supported image; maximum 5 MB.</div>
                </div>
                <div className="col-md-8">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Contact name</label>
                      <input className="form-control" name="name" value={providerProfile.name} onChange={handleProfileFieldChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone number</label>
                      <input className="form-control" name="phone" value={providerProfile.phone} onChange={handleProfileFieldChange} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Business name</label>
                      <input className="form-control" name="business_name" value={providerProfile.business_name} onChange={handleProfileFieldChange} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Business description</label>
                      <textarea className="form-control" name="bio" rows="4" value={providerProfile.bio} onChange={handleProfileFieldChange} placeholder="Describe your services, expertise and what customers can expect." />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Location</label>
                      <input className="form-control" name="location" value={providerProfile.location} onChange={handleProfileFieldChange} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Years of experience</label>
                      <input className="form-control" type="number" min="0" max="100" name="experience_years" value={providerProfile.experience_years} onChange={handleProfileFieldChange} required />
                    </div>
                    <div className="col-12">
                      <div className="rounded-3 bg-light p-3 small text-secondary">
                        <i className="bi bi-star-fill text-warning me-2"></i>Current rating: <strong>{user?.provider_profile?.rating_cache || '5.00'}/5</strong> · {user?.provider_profile?.total_reviews || 0} reviews. Ratings are managed by customer reviews.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-white border-0 p-4 text-end">
              <button className="btn btn-primary rounded-pill px-4 fw-bold" type="submit" disabled={savingProfile}>
                {savingProfile ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</> : <><i className="bi bi-check2-circle me-2"></i>Save profile</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-4">
                <h5 className="modal-title fw-bold">{editingServiceId ? 'Edit Service Offering' : 'Add Service Offering'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { setShowAddService(false); setEditingServiceId(null); }}></button>
              </div>
              <form onSubmit={handleAddServiceSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Service Name</label>
                    <input
                      type="text"
                      className="form-control rounded-3"
                      placeholder="e.g. MacBook Liquid Damage Cleanup"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Category</label>
                      <select
                        className="form-select rounded-3"
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small fw-semibold">Duration</label>
                      <select
                        className="form-select rounded-3"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) })}
                      >
                        <option value="30">30 Minutes</option>
                        <option value="60">60 Minutes (1 Hr)</option>
                        <option value="90">90 Minutes (1.5 Hr)</option>
                        <option value="120">120 Minutes (2 Hrs)</option>
                        <option value="180">180 Minutes (3 Hrs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Price (₹)</label>
                    <input
                      type="number"
                      className="form-control rounded-3"
                      placeholder="e.g. 750"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6"><label className="form-label small fw-semibold">Service location</label><input className="form-control rounded-3" value={newService.location} onChange={e=>setNewService({...newService, location:e.target.value})} placeholder="e.g. Kochi" /></div>
                    <div className="col-md-6"><label className="form-label small fw-semibold">Service image</label><input className="form-control rounded-3" type="file" accept="image/*" onChange={e=>{ const file=e.target.files?.[0] || null; if(file && (!file.type.startsWith('image/') || file.size > 8*1024*1024)){ setAlertMsg({text:'Choose an image file no larger than 8 MB.',type:'danger'}); e.target.value=''; return; } setNewService({...newService, image:file}); }} />{newService.image && typeof newService.image !== 'string' && <div className="small text-secondary mt-1">Selected: {newService.image.name}</div>}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      className="form-control rounded-3"
                      rows="3"
                      placeholder="What is included in this service?"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => { setShowAddService(false); setEditingServiceId(null); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">
                    {editingServiceId ? 'Save Changes' : 'Create Service'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
