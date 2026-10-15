import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BookingModal({ service, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getTomorrowStr());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && service && date) {
      fetchSlots();
    }
  }, [isOpen, service, date]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setErrorMsg('');
    setSelectedSlot(null);
    try {
      const res = await api.get(`/bookings/slots/?service_id=${service.id}&date=${date}`);
      setSlots(res.data.slots || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to fetch available slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in as a customer to book this service.');
      navigate('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      setErrorMsg('Only registered customers can book services. Please switch to a customer account.');
      return;
    }
    if (!selectedSlot) {
      setErrorMsg('Please select a time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/bookings/', {
        service_id: service.id,
        date: date,
        time: selectedSlot.start_time,
        notes: notes
      });

      setSuccessMsg('Booking Confirmed Successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data.booking);
        onClose();
        navigate('/customer/bookings');
      }, 1500);
    } catch (err) {
      // Handles Assessment Section 9: Double-booking prevention response
      const errDetail = err.response?.data?.error || 'Could not complete booking. Please try another slot.';
      setErrorMsg(errDetail);
      // Refresh slots immediately to show the newly taken slot
      fetchSlots();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !service) return null;

  return (
    <div 
      className="modal show d-block" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1050 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div className="modal-header bg-dark text-white p-4">
            <div>
              <span className="badge bg-primary mb-2">{service.category_name}</span>
              <h5 className="modal-title fw-bold">{service.name}</h5>
              <div className="small text-secondary mt-1">
                <i className="bi bi-person-circle me-1"></i> Provider: <strong className="text-light">{service.provider_details?.business_name}</strong>
                <span className="mx-2">•</span>
                <i className="bi bi-geo-alt-fill text-danger me-1"></i> {service.location}
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleBooking}>
            <div className="modal-body p-4">
              
              {errorMsg && (
                <div className="alert alert-danger d-flex align-items-center gap-2 rounded-3 shadow-sm" role="alert">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <div>{errorMsg}</div>
                </div>
              )}

              {successMsg && (
                <div className="alert alert-success d-flex align-items-center gap-2 rounded-3 shadow-sm" role="alert">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                  <div>{successMsg}</div>
                </div>
              )}

              <div className="row g-4">
                {/* Left Column: Service Details & Date */}
                <div className="col-md-5 border-end pe-md-4">
                  <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary small">Service Price:</span>
                      <span className="fw-bold fs-5 text-primary">₹{service.price}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary small">Duration:</span>
                      <span className="badge bg-secondary">{service.duration_minutes} Mins</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary small">Provider Rating:</span>
                      <span className="text-warning fw-semibold">
                        <i className="bi bi-star-fill me-1"></i>
                        {service.provider_details?.rating_cache || '5.0'} / 5.0
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-uppercase text-secondary">
                      Select Booking Date
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-lg rounded-3"
                      min={new Date().toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-uppercase text-secondary">
                      Specific Instructions / Notes
                    </label>
                    <textarea
                      className="form-control rounded-3"
                      rows="3"
                      placeholder="e.g., Please call before arriving, laptop model HP Envy..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Right Column: Time Slot Selector */}
                <div className="col-md-7 ps-md-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="form-label fw-semibold small text-uppercase text-secondary mb-0">
                      Available Time Slots ({date})
                    </label>
                    <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={fetchSlots} disabled={loadingSlots}>
                      <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>
                  </div>

                  {loadingSlots ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="small text-muted mt-2">Checking real-time provider availability...</div>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="alert alert-warning rounded-3 small text-center py-4">
                      <i className="bi bi-calendar-x fs-3 d-block mb-2 text-secondary"></i>
                      No available slots for this date. The provider may be closed or fully booked.
                    </div>
                  ) : (
                    <div>
                      <div className="d-flex gap-3 mb-3 small text-secondary">
                        <span><span className="badge bg-success me-1">●</span> Available</span>
                        <span><span className="badge bg-light text-muted border me-1">●</span> Booked</span>
                      </div>

                      <div className="row g-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {slots.map((s, idx) => (
                          <div className="col-4" key={idx}>
                            <button
                              type="button"
                              className={`w-100 slot-btn ${s.available ? 'available' : 'booked'} ${selectedSlot?.start_time === s.start_time ? 'selected' : ''}`}
                              disabled={!s.available}
                              onClick={() => setSelectedSlot(s)}
                            >
                              <div>{s.start_time}</div>
                              <small style={{ fontSize: '0.7rem' }}>to {s.end_time}</small>
                            </button>
                          </div>
                        ))}
                      </div>

                      {selectedSlot && (
                        <div className="mt-3 p-3 bg-primary bg-opacity-10 border border-primary rounded-3 text-primary d-flex align-items-center gap-2 small">
                          <i className="bi bi-check-circle-fill fs-5"></i>
                          <div>
                            Selected: <strong>{selectedSlot.start_time} - {selectedSlot.end_time}</strong> on <strong>{date}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="modal-footer bg-light p-3">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary rounded-pill px-5 fw-bold shadow"
                disabled={submitting || !selectedSlot}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Securing Slot...
                  </>
                ) : (
                  <>
                    <i className="bi bi-lock-fill me-1"></i> Confirm & Book (₹{service.price})
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
