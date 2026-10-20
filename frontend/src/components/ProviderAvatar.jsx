import React, { useState } from 'react';

const FALLBACK_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
];

export default function ProviderAvatar({ src, name, size = 28, className = 'rounded-circle me-2' }) {
  const [hasError, setHasError] = useState(false);

  const isBrokenDemoMedia = !src || (typeof src === 'string' && src.includes('demo_providers/'));

  let fullSrc = src;
  if (isBrokenDemoMedia || hasError) {
    const charCode = (name || 'P').charCodeAt(0);
    fullSrc = FALLBACK_AVATARS[charCode % FALLBACK_AVATARS.length];
  } else if (typeof fullSrc === 'string' && fullSrc.startsWith('/') && import.meta.env.VITE_API_URL) {
    fullSrc = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${fullSrc}`;
  }

  return (
    <img
      src={fullSrc}
      alt={`${name || 'Provider'} profile`}
      className={className}
      style={{ width: size, height: size, objectFit: 'cover' }}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
    />
  );
}
