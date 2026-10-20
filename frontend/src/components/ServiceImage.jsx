import React, { useState } from 'react';

// Maps category slugs to polished SVG illustration icons & gradient themes
const CATEGORY_THEMES = {
  'appliance-repair': { icon: 'bi-tools', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', color: '#16a34a' },
  'ac-cooling': { icon: 'bi-snow', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb' },
  'home-cleaning-plus': { icon: 'bi-house-heart', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', color: '#dc2626' },
  'plumbing-care': { icon: 'bi-wrench-adjustable', bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', color: '#0d9488' },
  'electrical-care': { icon: 'bi-lightning-charge', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', color: '#d97706' },
  'car-care': { icon: 'bi-car-front', bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#475569' },
  'beauty-wellness': { icon: 'bi-stars', bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', color: '#db2777' },
  'photography-events': { icon: 'bi-camera', bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', color: '#9333ea' },
  'tech-support': { icon: 'bi-laptop', bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', color: '#4f46e5' },
  'garden-moving': { icon: 'bi-box-seam', bg: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', color: '#ca8a04' },
};

const DEFAULT_THEME = { icon: 'bi-briefcase', bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', color: '#475569' };

export default function ServiceImage({ src, alt, categorySlug, className = 'service-listing-image mb-3' }) {
  const [hasError, setHasError] = useState(false);

  // If URL points to /media/demo_services/ which does not exist as physical files on disk, or if it errors out
  const isBrokenDemoMedia = !src || (typeof src === 'string' && src.startsWith('/media/demo_services/'));

  const theme = CATEGORY_THEMES[categorySlug] || DEFAULT_THEME;

  if (isBrokenDemoMedia || hasError) {
    return (
      <div
        className={`${className} d-flex flex-column align-items-center justify-content-center text-center p-3 border-0`}
        style={{
          background: theme.bg,
          minHeight: '160px',
          maxHeight: '180px',
        }}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-sm"
          style={{
            width: 58,
            height: 58,
            backgroundColor: '#ffffff',
            color: theme.color,
            fontSize: '1.75rem',
          }}
        >
          <i className={`bi ${theme.icon}`}></i>
        </div>
        <span className="fw-semibold text-secondary small text-truncate" style={{ maxWidth: '90%' }}>
          {alt}
        </span>
      </div>
    );
  }

  // Handle relative media path by prefixing VITE_API_URL if needed
  let fullSrc = src;
  if (typeof src === 'string' && src.startsWith('/') && import.meta.env.VITE_API_URL) {
    fullSrc = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${src}`;
  }

  return (
    <img
      src={fullSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
