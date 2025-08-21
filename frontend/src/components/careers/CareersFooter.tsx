/**
 * @file CareersFooter.tsx
 * @description Footer component for careers page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import './CareersFooter.css';

const CareersFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="careers-footer" role="contentinfo">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="company-info">
              <h3>Fullship</h3>
              <p>Building the future of workforce management, one team member at a time.</p>
              <div className="social-links">
                <a href="https://linkedin.com/company/fullship" aria-label="Follow us on LinkedIn">
                  LinkedIn
                </a>
                <a href="https://twitter.com/fullship" aria-label="Follow us on Twitter">
                  Twitter
                </a>
                <a href="https://github.com/fullship" aria-label="View our GitHub">
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#about-us">About Us</a></li>
              <li><a href="#job-listings">Open Positions</a></li>
              <li><a href="#benefits">Benefits</a></li>
              <li><a href="#testimonials">Team Stories</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="/blog">Engineering Blog</a></li>
              <li><a href="/diversity">Diversity & Inclusion</a></li>
              <li><a href="/culture">Company Culture</a></li>
              <li><a href="/press">Press Kit</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Get in Touch</h4>
            <ul>
              <li><a href="mailto:careers@fullship.com">careers@fullship.com</a></li>
              <li><a href="mailto:hello@fullship.com">General Inquiries</a></li>
              <li><a href="/contact">Contact Form</a></li>
              <li>
                <Link 
                  to="/login" 
                  className="staff-login-link"
                  style={{ 
                    color: '#3b82f6', 
                    fontWeight: '500',
                    textDecoration: 'none',
                    borderBottom: '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderBottomColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderBottomColor = 'transparent';
                  }}
                >
                  🔐 Staff Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="legal-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/equal-opportunity">Equal Opportunity</a>
          </div>
          <p className="copyright">
            © {currentYear} Fullship. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default CareersFooter;
