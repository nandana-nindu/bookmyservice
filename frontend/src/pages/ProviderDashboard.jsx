import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'services' | 'schedule'

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Services State
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: '',
    price: '',
    duration_minutes: 60,
    description: '',
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
  }, [statusFilter]);

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
      await api.post('/provider/services/', newService);
      setAlertMsg({ text: 'New service offering added successfully!', type: 'success' });
      setShowAddService(false);
      setNewService({ name: '', category: categories[0]?.id || '', price: '', duration_minutes: 60, description: '' });
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
        <div className="d-flex align-items-center gap-2">
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
            <button className="btn btn-primary rounded-pill px-4" onClick={() => setShowAddService(true)}>
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
                  <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                    <span className="fw-bold fs-5 text-primary">₹{s.price}</span>
                    <span className={`badge ${s.is_active ? 'bg-success' : 'bg-secondary'}`}>
                      {s.is_active ? 'Active' : 'Disabled'}
                    </span>
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

      {/* Add Service Modal */}
      {showAddService && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-4">
                <h5 className="modal-title fw-bold">Add Service Offering</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddService(false)}></button>
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
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowAddService(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">
                    Create Service
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
