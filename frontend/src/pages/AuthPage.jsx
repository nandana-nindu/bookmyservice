import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ isRegisterDefault = false }) {
  const [isRegister, setIsRegister] = useState(isRegisterDefault);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [role, setRole] = useState('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceLocation, setServiceLocation] = useState('Kochi');
  const [experienceYears, setExperienceYears] = useState(2);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const loggedUser = await login(loginEmail, loginPassword);
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'PROVIDER') {
        navigate('/provider/dashboard');
      } else {
        navigate('/customer/bookings');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        phone,
        password,
        role,
        ...(role === 'PROVIDER' ? {
          business_name: businessName,
          location: serviceLocation,
          experience_years: experienceYears
        } : {})
      };

      await register(payload);
      // Auto login after registration
      await login(email, password);
      if (role === 'PROVIDER') {
        navigate('/provider/dashboard');
      } else {
        navigate('/customer/bookings');
      }
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object') {
        const firstErrKey = Object.keys(data)[0];
        const val = data[firstErrKey];
        setErrorMsg(`${firstErrKey}: ${Array.isArray(val) ? val[0] : val}`);
      } else {
        setErrorMsg('Registration failed. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e, p) => {
    setLoginEmail(e);
    setLoginPassword(p);
    setLoading(true);
    try {
      const loggedUser = await login(e, p);
      if (loggedUser.role === 'ADMIN') navigate('/admin/dashboard');
      else if (loggedUser.role === 'PROVIDER') navigate('/provider/dashboard');
      else navigate('/customer/bookings');
    } catch (err) {
      setErrorMsg('Quick login failed. Ensure Django backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-8">
          
          <div className="text-center mb-4">
            <span className="badge bg-primary rounded-circle p-3 d-inline-flex mb-2">
              <i className="bi bi-calendar2-check-fill text-white fs-4"></i>
            </span>
            <h3 className="fw-bold">{isRegister ? 'Create an Account' : 'Welcome Back'}</h3>
            <p className="text-secondary small">
              {isRegister ? 'Join BookMyService as a customer or service provider' : 'Sign in to manage your appointments and services'}
            </p>
          </div>

          <div className="card border-0 shadow-lg rounded-4 overflow-hidden p-4">
            
            {/* Tab switch */}
            <div className="d-flex bg-light p-1 rounded-pill mb-4">
              <button
                className={`btn btn-sm rounded-pill flex-fill fw-bold ${!isRegister ? 'btn-white bg-white shadow-sm text-primary' : 'text-secondary'}`}
                onClick={() => { setIsRegister(false); setErrorMsg(''); }}
              >
                Sign In
              </button>
              <button
                className={`btn btn-sm rounded-pill flex-fill fw-bold ${isRegister ? 'btn-white bg-white shadow-sm text-primary' : 'text-secondary'}`}
                onClick={() => { setIsRegister(true); setErrorMsg(''); }}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="alert alert-danger small rounded-3 mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-circle-fill"></i>
                <div>{errorMsg}</div>
              </div>
            )}

            {!isRegister ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Email Address</label>
                  <input
                    type="email"
                    className="form-control rounded-3"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-secondary">Password</label>
                  <input
                    type="password"
                    className="form-control rounded-3"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow-sm" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegisterSubmit}>
                {/* Role Selector */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary d-block">I want to register as:</label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="roleOptions"
                      id="roleCustomer"
                      checked={role === 'CUSTOMER'}
                      onChange={() => setRole('CUSTOMER')}
                    />
                    <label className="btn btn-outline-primary btn-sm rounded-start-pill py-2" htmlFor="roleCustomer">
                      <i className="bi bi-person me-1"></i> Customer
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      name="roleOptions"
                      id="roleProvider"
                      checked={role === 'PROVIDER'}
                      onChange={() => setRole('PROVIDER')}
                    />
                    <label className="btn btn-outline-primary btn-sm rounded-end-pill py-2" htmlFor="roleProvider">
                      <i className="bi bi-tools me-1"></i> Service Provider
                    </label>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Full Name</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Email Address</label>
                  <input
                    type="email"
                    className="form-control rounded-3"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Phone Number</label>
                  <input
                    type="text"
                    className="form-control rounded-3"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                {role === 'PROVIDER' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-secondary">Business / Brand Name</label>
                      <input
                        type="text"
                        className="form-control rounded-3"
                        placeholder="e.g. Precision Fixers"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col-7">
                        <label className="form-label small fw-semibold text-secondary">City / Region</label>
                        <input
                          type="text"
                          className="form-control rounded-3"
                          value={serviceLocation}
                          onChange={(e) => setServiceLocation(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-5">
                        <label className="form-label small fw-semibold text-secondary">Years Exp.</label>
                        <input
                          type="number"
                          className="form-control rounded-3"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-secondary">Password</label>
                  <input
                    type="password"
                    className="form-control rounded-3"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow-sm" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </form>
            )}

            {/* Quick Demo Logins Box */}
            <div className="mt-4 pt-3 border-top text-center">
              <span className="small text-muted d-block mb-2">⚡ Quick 1-Click Assessment Logins:</span>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary btn-sm rounded-pill fw-semibold"
                  onClick={() => handleQuickLogin('nandana@bookmyservice.com', 'nandana123')}
                >
                  <i className="bi bi-person-heart me-1"></i> Nandana
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-pill"
                  onClick={() => handleQuickLogin('customer@bookmyservice.com', 'customer123')}
                >
                  Customer
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm rounded-pill"
                  onClick={() => handleQuickLogin('apex.tech@bookmyservice.com', 'provider123')}
                >
                  Provider
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm rounded-pill"
                  onClick={() => handleQuickLogin('admin@bookmyservice.com', 'admin123')}
                >
                  Admin
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
