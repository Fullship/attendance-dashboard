/**
 * @file HeroBanner.tsx
 * @description Hero section with mission statement and CTAs
 */

import React from 'react';
import './HeroBanner.css';

interface HeroBannerProps {
  onApplyClick: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ onApplyClick }) => {
  const scrollToJobs = () => {
    const jobsSection = document.getElementById('job-listings');
    jobsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTalentNetwork = () => {
    const applicationForm = document.getElementById('application-form');
    applicationForm?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToNextSection = () => {
    const companySection = document.getElementById('company-introduction');
    companySection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-banner" role="banner">
      <div className="hero-background">
        <img 
          src="/images/team-workplace.jpg" 
          alt="Fullship team collaborating in modern office" 
          className="hero-bg-image"
          loading="eager"
        />
        <div className="hero-overlay" aria-hidden="true"></div>
      </div>
      
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-headline">
            Build the Future of 
            <span className="hero-highlight"> Workforce Management</span>
          </h1>
          
          <p className="hero-subtext">
            Join our passionate team in revolutionizing how companies manage attendance, 
            streamline operations, and empower their workforce. We're building tools that 
            make work better for millions of people worldwide.
          </p>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Companies Served</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">2M+</span>
              <span className="stat-label">Employees Managed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
        
        <div className="hero-actions">
          <button 
            className="cta-button primary"
            onClick={() => {
              scrollToJobs();
              onApplyClick();
            }}
            aria-label="View open positions"
          >
            See Open Roles
          </button>
          
          <button 
            className="cta-button secondary"
            onClick={scrollToTalentNetwork}
            aria-label="Join our talent network for future opportunities"
          >
            Join Talent Network
          </button>
        </div>
      </div>

      {/* Animated Scroll Down Button */}
      <div className="scroll-down-indicator">
        <button 
          className="scroll-down-btn"
          onClick={scrollToNextSection}
          aria-label="Scroll down to learn more"
        >
          <span className="scroll-text">Scroll to explore</span>
          <div className="scroll-icon">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="chevron-down"
            >
              <path 
                d="M7 10L12 15L17 10" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>
    </section>
  );
};

export default HeroBanner;
