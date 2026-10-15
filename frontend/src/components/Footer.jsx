import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-dark text-white pt-5 pb-4 mt-auto border-top border-secondary">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <h5 className="fw-bold text-white d-flex align-items-center gap-2">
              <i className="bi bi-calendar2-check-fill text-primary"></i> BookMyService
            </h5>
            <p className="text-secondary small mt-2">
              A comprehensive on-demand service booking & provider management platform built for reliable, race-condition-proof appointment scheduling.
            </p>
            <div className="d-flex gap-2 text-secondary small">
              <span className="badge bg-secondary">Django REST</span>
              <span className="badge bg-secondary">React</span>
              <span className="badge bg-secondary">Bootstrap 5</span>
              <span className="badge bg-secondary">PostgreSQL</span>
            </div>
          </div>

          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold text-light mb-3">Popular Services</h6>
            <ul className="list-unstyled text-secondary small">
              <li className="mb-2">Laptop Repair</li>
              <li className="mb-2">AC Deep Cleaning</li>
              <li className="mb-2">Home Sanitization</li>
              <li className="mb-2">Plumbing Solutions</li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold text-light mb-3">Core Features</h6>
            <ul className="list-unstyled text-secondary small">
              <li className="mb-2"><i className="bi bi-check2 text-success me-1"></i> Double Booking Prevention</li>
              <li className="mb-2"><i className="bi bi-check2 text-success me-1"></i> Real-time Slot Engine</li>
              <li className="mb-2"><i className="bi bi-check2 text-success me-1"></i> 2-Hour Cancellation Rule</li>
              <li className="mb-2"><i className="bi bi-check2 text-success me-1"></i> Role-Based Permissions</li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold text-light mb-3">Repository & Project</h6>
            <p className="text-secondary small">
              Web Development Assessment Deliverable.
            </p>
            <a 
              href="https://github.com/nandana-nindu/bookmyservice" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-outline-light btn-sm rounded-pill d-inline-flex align-items-center gap-2"
            >
              <i className="bi bi-github fs-6"></i> GitHub Repository
            </a>
          </div>
        </div>

        <div className="border-top border-secondary mt-4 pt-3 text-center text-secondary small">
          © {new Date().getFullYear()} BookMyService Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
