import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [adminQuery, setAdminQuery] = useState('');
  const [adminBookingStatus, setAdminBookingStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, servicesRes, bookingsRes, categoriesRes] = await Promise.all([
        api.get('/bookings/admin/stats/'),
        api.get('/auth/admin/users/'),
        api.get('/admin/services/'),
        api.get('/bookings/admin/'),
        api.get('/categories/')
      ]);
      setStats(statsRes.data?.stats);
      setRecentBookings(statsRes.data?.recent_bookings || []);
      setUsers(usersRes.data || []);
      setAllServices(servicesRes.data || []);
      setAllBookings(bookingsRes.data || []);
      setAllCategories(categoriesRes.data || []);
    } catch (err) {
      console.error(err);
      setAlertMsg({ text: 'Failed to load admin telemetry.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await api.post(`/auth/admin/users/${userId}/toggle-status/`);
      setAlertMsg({ text: res.data.message, type: 'success' });
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch (err) {
      setAlertMsg({ text: err.response?.data?.error || 'Failed to update user status.', type: 'danger' });
    }
  };

  const filteredUsers = userRoleFilter 
    ? users.filter(u => u.role === userRoleFilter)
    : users;

  const toggleServiceStatus = async (service) => {
    try {
      const response = await api.patch(`/admin/services/${service.id}/`, { is_active: !service.is_active });
      setAllServices(prev => prev.map(item => item.id === service.id ? response.data : item));
      setAlertMsg({ text: `Service ${!service.is_active ? 'activated' : 'deactivated'} successfully.`, type: 'success' });
    } catch (err) { setAlertMsg({ text: err.response?.data?.detail || 'Could not update service.', type: 'danger' }); }
  };

  const updateAdminBooking = async (booking, nextStatus) => {
    try {
      const response = await api.patch(`/bookings/admin/${booking.id}/`, { status: nextStatus });
      setAllBookings(prev => prev.map(item => item.id === booking.id ? response.data.booking : item));
      setAlertMsg({ text: response.data.message, type: 'success' });
    } catch (err) { setAlertMsg({ text: err.response?.data?.error || 'Could not update booking.', type: 'danger' }); }
  };


  const editCategory = async (category) => {
    const name = window.prompt('Category name', category.name);
    if (name === null || !name.trim()) return;
    const description = window.prompt('Category description', category.description || '');
    if (description === null) return;
    try {
      const response = await api.patch(`/admin/categories/${category.id}/`, { name: name.trim(), description });
      setAllCategories(prev => prev.map(item => item.id === category.id ? { ...item, ...response.data } : item));
      setAlertMsg({ text: 'Category updated.', type: 'success' });
    } catch (err) { setAlertMsg({ text: err.response?.data?.name?.[0] || err.response?.data?.error || 'Could not update category.', type: 'danger' }); }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete category “${category.name}”? Categories containing services cannot be deleted.`)) return;
    try {
      await api.delete(`/admin/categories/${category.id}/`);
      setAllCategories(prev => prev.filter(item => item.id !== category.id));
      setAlertMsg({ text: 'Category deleted.', type: 'success' });
    } catch (err) { setAlertMsg({ text: err.response?.data?.error || 'Could not delete category. It may still contain services.', type: 'danger' }); }
  };

  const visibleAdminServices = allServices.filter(item => `${item.name} ${item.provider_details?.business_name || ''} ${item.category_name || ''}`.toLowerCase().includes(adminQuery.toLowerCase()));
  const visibleAdminBookings = allBookings.filter(item => (!adminBookingStatus || item.status === adminBookingStatus) && `${item.id} ${item.service_details?.name || ''} ${item.customer_name || ''} ${item.provider_name || ''}`.toLowerCase().includes(adminQuery.toLowerCase()));


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
          <h2 className="fw-bold mb-1">Administrator Platform Console</h2>
          <p className="text-secondary small mb-0">Platform overview, telemetry metrics, and account access management.</p>
        </div>
        <span className="badge bg-danger px-3 py-2 rounded-pill fw-bold">
          <i className="bi bi-shield-lock-fill me-1"></i> Root Administrator
        </span>
      </div>

      {alertMsg.text && (
        <div className={`alert alert-${alertMsg.type} alert-dismissible fade show rounded-3 shadow-sm`} role="alert">
          {alertMsg.text}
          <button type="button" className="btn-close" onClick={() => setAlertMsg({ text: '', type: '' })}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        <>
          {/* Telemetry Stat Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-sm-6">
              <div className="stat-card">
                <div className="stat-icon bg-primary bg-opacity-10 text-primary">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div>
                  <div className="text-secondary small">Total Customers</div>
                  <h3 className="fw-bold mb-0">{stats?.total_customers || 0}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="stat-card">
                <div className="stat-icon bg-success bg-opacity-10 text-success">
                  <i className="bi bi-person-workspace"></i>
                </div>
                <div>
                  <div className="text-secondary small">Active Providers</div>
                  <h3 className="fw-bold mb-0">{stats?.total_providers || 0}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="stat-card">
                <div className="stat-icon bg-info bg-opacity-10 text-info">
                  <i className="bi bi-journal-bookmark-fill"></i>
                </div>
                <div>
                  <div className="text-secondary small">Total Bookings</div>
                  <h3 className="fw-bold mb-0">{stats?.total_bookings || 0}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="stat-card">
                <div className="stat-icon bg-warning bg-opacity-10 text-warning">
                  <i className="bi bi-currency-rupee"></i>
                </div>
                <div>
                  <div className="text-secondary small">Total Revenue (Completed)</div>
                  <h3 className="fw-bold mb-0 text-success">₹{stats?.total_revenue?.toLocaleString() || 0}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Status Breakdown Progress Pills */}
          <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
            <h6 className="fw-bold text-uppercase small text-secondary mb-3">Booking Status Distribution</h6>
            <div className="row g-3 text-center">
              <div className="col-sm">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted mb-1">Pending</div>
                  <div className="fw-bold fs-4 text-warning">{stats?.pending_bookings || 0}</div>
                </div>
              </div>
              <div className="col-sm">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted mb-1">Confirmed</div>
                  <div className="fw-bold fs-4 text-primary">{stats?.confirmed_bookings || 0}</div>
                </div>
              </div>
              <div className="col-sm">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted mb-1">In Progress</div>
                  <div className="fw-bold fs-4 text-purple" style={{ color: '#6b21a8' }}>{stats?.in_progress_bookings || 0}</div>
                </div>
              </div>
              <div className="col-sm">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted mb-1">Completed</div>
                  <div className="fw-bold fs-4 text-success">{stats?.completed_bookings || 0}</div>
                </div>
              </div>
              <div className="col-sm">
                <div className="p-3 bg-light rounded-3">
                  <div className="small text-muted mb-1">Cancelled</div>
                  <div className="fw-bold fs-4 text-danger">{stats?.cancelled_bookings || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
            <h5 className="fw-bold mb-0">Platform records</h5>
            <input className="form-control" style={{ maxWidth: 360 }} value={adminQuery} onChange={e => setAdminQuery(e.target.value)} placeholder="Search services, providers, customers or bookings" />
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="p-4 bg-light border-bottom"><h5 className="fw-bold mb-0">Service Categories</h5><span className="small text-secondary">Edit category details or remove unused categories.</span></div>
            <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th className="ps-4">Category</th><th>Slug</th><th>Services</th><th className="text-end pe-4">Actions</th></tr></thead><tbody>
              {allCategories.map(category => <tr key={category.id}><td className="ps-4"><div className="fw-bold">{category.name}</div><div className="small text-secondary">{category.description}</div></td><td>{category.slug}</td><td>{category.services_count ?? '—'}</td><td className="text-end pe-4"><div className="d-flex justify-content-end gap-2"><button className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => editCategory(category)}>Edit</button><button className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => deleteCategory(category)}>Delete</button></div></td></tr>)}
              {allCategories.length === 0 && <tr><td colSpan="4" className="text-center text-secondary py-4">No categories found.</td></tr>}
            </tbody></table></div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="p-4 bg-light border-bottom"><h5 className="fw-bold mb-0">All Services</h5><span className="small text-secondary">Inspect services from every provider and activate/deactivate listings.</span></div>
            <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th className="ps-4">Service</th><th>Provider</th><th>Category</th><th>Price</th><th>Status</th><th className="text-end pe-4">Action</th></tr></thead><tbody>
              {visibleAdminServices.map(service => <tr key={service.id}><td className="ps-4"><div className="fw-bold">{service.name}</div><div className="small text-secondary">{service.description}</div></td><td>{service.provider_details?.business_name || 'Provider'}</td><td>{service.category_name}</td><td>₹{service.price}</td><td><span className={`badge ${service.is_active ? 'bg-success' : 'bg-secondary'}`}>{service.is_active ? 'Active' : 'Inactive'}</span></td><td className="text-end pe-4"><button className={`btn btn-sm rounded-pill ${service.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleServiceStatus(service)}>{service.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)}
              {visibleAdminServices.length === 0 && <tr><td colSpan="6" className="text-center text-secondary py-4">No matching services.</td></tr>}
            </tbody></table></div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="p-4 bg-light border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2"><div><h5 className="fw-bold mb-0">All Bookings</h5><span className="small text-secondary">Search and filter platform-wide bookings. Only valid status transitions are accepted.</span></div><select className="form-select form-select-sm w-auto" value={adminBookingStatus} onChange={e=>setAdminBookingStatus(e.target.value)}><option value="">All statuses</option>{['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED'].map(status => <option key={status}>{status}</option>)}</select></div>
            <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th className="ps-4">Booking</th><th>Customer</th><th>Provider</th><th>Service</th><th>Date/time</th><th>Status</th><th>Update status</th></tr></thead><tbody>
              {visibleAdminBookings.map(booking => <tr key={booking.id}><td className="ps-4">#{booking.id}</td><td>{booking.customer_name}<div className="small text-secondary">{booking.customer_email}</div></td><td>{booking.provider_name}</td><td>{booking.service_details?.name}</td><td>{booking.booking_date}<div className="small text-secondary">{booking.start_time}–{booking.end_time}</div></td><td>{getStatusBadge(booking.status)}</td><td><select aria-label={`Update booking ${booking.id}`} className="form-select form-select-sm" value={booking.status} onChange={e=>updateAdminBooking(booking,e.target.value)}><option value={booking.status}>{booking.status}</option>{({PENDING:['CONFIRMED','REJECTED','CANCELLED'],CONFIRMED:['IN_PROGRESS','CANCELLED'],IN_PROGRESS:['COMPLETED'],COMPLETED:[],CANCELLED:[],REJECTED:[]})[booking.status]?.map(status => <option key={status}>{status}</option>)}</select></td></tr>)}
              {visibleAdminBookings.length === 0 && <tr><td colSpan="7" className="text-center text-secondary py-4">No matching bookings.</td></tr>}
            </tbody></table></div>
          </div>

          {/* User Account Controls */}
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
            <div className="p-4 bg-light border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0">Platform User Accounts</h5>
                <span className="small text-secondary">Manage customer and service provider access</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-secondary">Filter by Role:</span>
                <select
                  className="form-select form-select-sm w-auto"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="CUSTOMER">Customers Only</option>
                  <option value="PROVIDER">Providers Only</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">User</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-end pe-4">Account Control</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="ps-4">
                        <div className="fw-bold text-dark">{u.name}</div>
                        <div className="small text-secondary">{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'ADMIN' ? 'bg-danger' : u.role === 'PROVIDER' ? 'bg-success' : 'bg-primary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="small text-secondary">{u.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="small text-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="text-end pe-4">
                        {u.role === 'ADMIN' ? (
                          <span className="text-muted small">Protected</span>
                        ) : (
                          <button
                            className={`btn btn-sm rounded-pill px-3 fw-semibold ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleUserStatus(u.id)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
