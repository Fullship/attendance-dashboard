/**
 * @file CompanyIntroduction.tsx
 * @description Company mission, vision, values and culture section
 */

import React from 'react';
import './CompanyIntroduction.css';

interface CultureValue {
  icon: string;
  title: string;
  description: string;
}

const CompanyIntroduction: React.FC = () => {
  const cultureValues: CultureValue[] = [
    {
      icon: '🚀',
      title: 'Innovation First',
      description: 'We continuously push boundaries and embrace cutting-edge technologies to solve complex workforce challenges.'
    },
    {
      icon: '🤝',
      title: 'Collaborative Spirit',
      description: 'We believe in the power of teamwork, open communication, and supporting each other to achieve common goals.'
    },
    {
      icon: '📈',
      title: 'Growth Mindset',
      description: 'We foster continuous learning, embrace challenges, and view failures as opportunities to improve and grow.'
    },
    {
      icon: '🌍',
      title: 'Global Impact',
      description: 'We are committed to building solutions that make work better for millions of people around the world.'
    },
    {
      icon: '⚖️',
      title: 'Work-Life Balance',
      description: 'We prioritize wellbeing and believe that great work comes from sustainable, balanced lifestyles.'
    },
    {
      icon: '💡',
      title: 'Customer Obsession',
      description: 'Every decision we make starts with understanding and exceeding our customers needs and expectations.'
    }
  ];

  return (
    <section className="company-introduction" id="company-introduction">
      <div className="container">
        {/* Mission and Vision */}
        <div className="company-story">
          <div className="story-content">
            <h2 className="section-title">Building the Future of Work</h2>
            
            <div className="mission-vision-grid">
              <div className="mission-card">
                <h3>Our Mission</h3>
                <p>
                  To revolutionize workforce management by creating intuitive, powerful tools 
                  that streamline operations and empower organizations to focus on what matters 
                  most—their people and growth.
                </p>
              </div>
              
              <div className="vision-card">
                <h3>Our Vision</h3>
                <p>
                  A world where every organization has access to smart, efficient workforce 
                  management solutions that adapt to their unique needs and scale with their ambitions.
                </p>
              </div>
            </div>
            
            <div className="company-description">
              <p>
                Founded with the belief that technology should simplify, not complicate, 
                Fullship has grown from a small startup to a trusted partner for thousands 
                of organizations worldwide. We're not just building software—we're crafting 
                experiences that make every workday more productive, transparent, and meaningful.
              </p>
            </div>
          </div>
          
          <div className="story-visual">
            <img 
              src="/images/company-timeline.svg" 
              alt="Fullship company growth timeline"
              loading="lazy"
              className="timeline-image"
            />
          </div>
        </div>

        {/* Culture Values */}
        <div className="culture-section">
          <h3 className="culture-title">Our Culture & Values</h3>
          <p className="culture-description">
            We're more than just colleagues—we're a community of passionate individuals 
            united by shared values and a common mission.
          </p>
          
          <div className="culture-grid">
            {cultureValues.map((value, index) => (
              <div 
                key={index} 
                className="culture-card"
                role="article"
                aria-labelledby={`culture-title-${index}`}
              >
                <div className="culture-icon" aria-hidden="true">
                  {value.icon}
                </div>
                <h4 id={`culture-title-${index}`} className="culture-card-title">
                  {value.title}
                </h4>
                <p className="culture-card-description">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Company Stats */}
        <div className="company-stats">
          <h3 className="stats-title">By the Numbers</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-value">150+</span>
              <span className="stat-label">Team Members</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">40+</span>
              <span className="stat-label">Countries</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">5</span>
              <span className="stat-label">Offices Worldwide</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">98%</span>
              <span className="stat-label">Employee Satisfaction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyIntroduction;
