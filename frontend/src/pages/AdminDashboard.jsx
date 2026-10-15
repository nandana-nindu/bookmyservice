import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/bookings/admin/stats/'),
        api.get('/auth/admin/users/')
      ]);
      setStats(statsRes.data?.stats);
      setRecentBookings(statsRes.data?.recent_bookings || []);
      setUsers(usersRes.data || []);
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
