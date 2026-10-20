import React, { useState } from 'react';

export default function ProviderAvatar({ src, name, size = 28, className = 'rounded-circle me-2' }) {
  const [hasError, setHasError] = useState(false);

  const isBrokenDemoMedia = !src || (typeof src === 'string' && src.includes('demo_providers/'));

  if (isBrokenDemoMedia || hasError) {
    const initial = (name || 'P').trim().charAt(0).toUpperCase();
    return (
      <div
        className={`${className} d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary fw-bold border`}
        style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.45)), flexShrink: 0 }}
        title={name}
      >
        {initial}
      </div>
    );
  }

  let fullSrc = src;
  if (typeof src === 'string' && src.startsWith('/') && import.meta.env.VITE_API_URL) {
    fullSrc = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${src}`;
  }

  return (
    <img
      src={fullSrc}
      alt={`${name || 'Provider'} profile`}
      className={className}
      style={{ width: size, height: size, objectFit: 'cover' }}
      onError={() => setHasError(true)}
    />
  );
}
