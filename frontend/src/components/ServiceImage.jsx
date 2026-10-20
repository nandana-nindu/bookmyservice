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

const FALLBACK_CATEGORY_IMAGES = {
  'appliance-repair': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  'ac-cooling': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
  'home-cleaning-plus': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
  'plumbing-care': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
  'electrical-care': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80',
  'car-care': 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800&auto=format&fit=crop&q=80',
  'beauty-wellness': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80',
  'photography-events': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
  'tech-support': 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
  'garden-moving': 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?w=800&auto=format&fit=crop&q=80',
};

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80';

export default function ServiceImage({ src, alt, categorySlug, className = 'service-listing-image mb-3' }) {
  const [hasError, setHasError] = useState(false);

  // Determine the effective image source:
  // If no src, or if it points to non-existent local /media/demo_services/, or if image failed to load,
  // use the category-specific high-resolution Unsplash photo.
  const isBrokenDemoMedia = !src || (typeof src === 'string' && src.startsWith('/media/demo_services/'));
  
  let targetSrc = src;
  if (isBrokenDemoMedia || hasError) {
    targetSrc = FALLBACK_CATEGORY_IMAGES[categorySlug] || DEFAULT_FALLBACK_IMAGE;
  } else if (typeof targetSrc === 'string' && targetSrc.startsWith('/') && import.meta.env.VITE_API_URL) {
    targetSrc = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${targetSrc}`;
  }

  return (
    <img
      src={targetSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
    />
  );
}
