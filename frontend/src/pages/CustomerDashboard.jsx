import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my-bookings/');
      setBookings(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel/`, {
        reason: 'Cancelled by customer'
      });
      setSuccessMsg(res.data.message);
      fetchBookings();
    } catch (err) {
      // Highlights the 2-hour rule from assessment Section 11!
      setErrorMsg(err.response?.data?.error || 'Cancellation failed.');
    }
  };

  const openRescheduleModal = (booking) => {
    setRescheduleBooking(booking);
    setNewDate(booking.booking_date);
    setSelectedRescheduleSlot(null);
    fetchRescheduleSlots(booking.service, booking.booking_date);
  };

  const fetchRescheduleSlots = async (serviceId, dateStr) => {
    setLoadingRescheduleSlots(true);
    try {
      const res = await api.get(`/bookings/slots/?service_id=${serviceId}&date=${dateStr}`);
      setRescheduleSlots(res.data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRescheduleSlot) {
      alert('Please select a new time slot.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/bookings/${rescheduleBooking.id}/reschedule/`, {
        date: newDate,
        time: selectedRescheduleSlot.start_time
      });
      setSuccessMsg(res.data.message);
      setRescheduleBooking(null);
      fetchBookings();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Reschedule failed.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/bookings/${reviewBooking.id}/review/`, {
        rating,
        comment
      });
      setSuccessMsg('Review submitted successfully!');
      setReviewBooking(null);
      fetchBookings();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit review.');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Customer Dashboard</h2>
          <p className="text-secondary small mb-0">Welcome back, <strong>{user?.name}</strong>. Manage your service bookings.</p>
        </div>
        <Link to="/services" className="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm">
          <i className="bi bi-plus-lg me-1"></i> Book New Service
        </Link>
      </div>

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm" role="alert">
          <i className="bi bi-exclamation-octagon-fill me-2"></i> {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show rounded-3 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i> {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white p-5 rounded-4 text-center border shadow-sm">
          <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
          <h5 className="fw-bold">You have no service bookings yet</h5>
          <p className="text-muted small">Explore our verified service providers and book your first appointment.</p>
          <Link to="/services" className="btn btn-primary rounded-pill px-4 mt-2">
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Booking ID</th>
                  <th>Service & Provider</th>
                  <th>Date & Time Slot</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="ps-4 fw-semibold text-secondary">#{b.id}</td>
                    <td>
                      <div className="fw-bold text-dark">{b.service_details?.name}</div>
                      <div className="small text-secondary">
                        <i className="bi bi-building me-1"></i> {b.provider_name}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">
                        <i className="bi bi-calendar3 me-1 text-primary"></i> {b.booking_date}
                      </div>
                      <div className="small text-secondary">
                        <i className="bi bi-clock me-1"></i> {b.start_time} - {b.end_time}
                      </div>
                    </td>
                    <td className="fw-bold text-primary">₹{b.total_price}</td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td className="text-end pe-4">
                      {/* Action buttons based on status & 2-hr policy */}
                      {['PENDING', 'CONFIRMED'].includes(b.status) && (
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            className="btn btn-outline-primary btn-sm rounded-pill px-3"
                            onClick={() => openRescheduleModal(b)}
                            disabled={!b.can_cancel}
                            title={!b.can_cancel ? 'Rescheduling is closed within 2 hours of scheduled time' : 'Reschedule booking'}
                          >
                            <i className="bi bi-calendar-range me-1"></i> Reschedule
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm rounded-pill px-3"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={!b.can_cancel}
                            title={!b.can_cancel ? 'Cancellation closed within 2 hours of scheduled time' : 'Cancel booking'}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {b.status === 'COMPLETED' && (
                        b.review ? (
                          <span className="badge bg-light text-warning border px-3 py-2 rounded-pill">
                            <i className="bi bi-star-fill me-1"></i> Reviewed ({b.review.rating}/5)
                          </span>
                        ) : (
                          <button
                            className="btn btn-warning btn-sm rounded-pill px-3 fw-semibold text-dark shadow-sm"
                            onClick={() => setReviewBooking(b)}
                          >
                            <i className="bi bi-star-fill me-1"></i> Leave Review
                          </button>
                        )
                      )}

                      {['CANCELLED', 'REJECTED'].includes(b.status) && (
                        <span className="text-muted small">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-4">
                <h5 className="modal-title fw-bold">Reschedule Booking #{rescheduleBooking.id}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setRescheduleBooking(null)}></button>
              </div>
              <form onSubmit={handleRescheduleSubmit}>
                <div className="modal-body p-4">
                  <div className="alert alert-info small rounded-3">
                    <i className="bi bi-info-circle-fill me-1"></i> Select a new date and time slot. Your current slot ({rescheduleBooking.start_time}) will be released automatically.
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Date</label>
                    <input
                      type="date"
                      className="form-control rounded-3"
                      min={new Date().toISOString().split('T')[0]}
                      value={newDate}
                      onChange={(e) => {
                        setNewDate(e.target.value);
                        fetchRescheduleSlots(rescheduleBooking.service, e.target.value);
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Available Slots for {newDate}</label>
                    {loadingRescheduleSlots ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary"></div>
                      </div>
                    ) : (
                      <div className="row g-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {rescheduleSlots.map((s, idx) => (
                          <div className="col-4" key={idx}>
                            <button
                              type="button"
                              className={`w-100 slot-btn ${s.available ? 'available' : 'booked'} ${selectedRescheduleSlot?.start_time === s.start_time ? 'selected' : ''}`}
                              disabled={!s.available}
                              onClick={() => setSelectedRescheduleSlot(s)}
                            >
                              {s.start_time}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setRescheduleBooking(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold" disabled={!selectedRescheduleSlot}>
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-4">
                <h5 className="modal-title fw-bold">Review {reviewBooking.provider_name}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setReviewBooking(null)}></button>
              </div>
              <form onSubmit={handleReviewSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3 text-center">
                    <label className="form-label small fw-semibold d-block text-secondary">Select Rating</label>
                    <div className="d-flex justify-content-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          className="btn btn-link p-1 text-decoration-none"
                          onClick={() => setRating(star)}
                        >
                          <i className={`bi bi-star${star <= rating ? '-fill text-warning' : ' text-secondary'} fs-2`}></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Your Review / Comments</label>
                    <textarea
                      className="form-control rounded-3"
                      rows="4"
                      placeholder="Describe your experience with the technician and quality of service..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setReviewBooking(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">
                    Submit Review
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
