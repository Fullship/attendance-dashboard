/**
 * @file SkipNavLink.tsx
 * @description Accessibility skip navigation link component
 */

import React from 'react';
import './SkipNavLink.css';

const SkipNavLink: React.FC = () => {
  return (
    <a 
      href="#main-content" 
      className="skip-nav-link"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
};

export default SkipNavLink;
