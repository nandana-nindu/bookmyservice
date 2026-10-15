import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-3">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-white fs-4" to="/">
          <span className="badge bg-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
            <i className="bi bi-calendar2-check-fill text-white fs-5"></i>
          </span>
          <span>BookMy<span className="text-primary">Service</span></span>
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3">
            <li className="nav-item">
              <Link className="nav-link" to="/services">
                <i className="bi bi-grid-fill me-1"></i> Browse Services
              </Link>
            </li>

            {user?.role === 'CUSTOMER' && (
              <li className="nav-item">
                <Link className="nav-link" to="/customer/bookings">
                  <i className="bi bi-calendar-event me-1"></i> My Bookings
                </Link>
              </li>
            )}

            {user?.role === 'PROVIDER' && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/provider/dashboard">
                    <i className="bi bi-speedometer2 me-1"></i> Provider Hub
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/provider/services">
                    <i className="bi bi-gear-wide-connected me-1"></i> My Services
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/provider/schedule">
                    <i className="bi bi-clock-history me-1"></i> Working Hours
                  </Link>
                </li>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <Link className="nav-link text-warning fw-semibold" to="/admin/dashboard">
                  <i className="bi bi-shield-lock-fill me-1"></i> Admin Console
                </Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">

            {user ? (
              <div className="d-flex align-items-center gap-2">
                <div className="text-end d-none d-sm-block">
                  <div className="text-white fw-semibold small">{user.name}</div>
                  <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger' : user.role === 'PROVIDER' ? 'bg-success' : 'bg-primary'}`} style={{ fontSize: '0.7rem' }}>
                    {user.role}
                  </span>
                </div>
                <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={logout} title="Sign Out">
                  <i className="bi bi-box-arrow-right"></i>
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm rounded-pill px-3">
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
