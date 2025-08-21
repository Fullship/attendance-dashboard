/**
 * @file BenefitsPerks.tsx
 * @description Benefits and perks section with interactive cards
 */

import React, { useState, useEffect } from 'react';
import './BenefitsPerks.css';

interface Benefit {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'health' | 'financial' | 'growth' | 'lifestyle' | 'general';
  highlights?: string[];
}

const BenefitsPerks: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedBenefit, setExpandedBenefit] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefits = async () => {
      try {
        console.log('🔄 Fetching benefits from admin-managed data...');
        const response = await fetch('/api/careers/benefits');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Benefits fetched successfully:', data.benefits);
          
          // Transform admin data to component format
          const transformedBenefits: Benefit[] = data.benefits.map((benefit: any, index: number) => ({
            id: index.toString(),
            title: benefit.title,
            description: benefit.description,
            icon: benefit.icon || '🎯',
            category: benefit.category || 'general',
            highlights: [] // Admin doesn't currently have highlights, could be added later
          }));
          
          setBenefits(transformedBenefits);
        } else {
          console.error('❌ Failed to fetch benefits, using fallback data');
          setBenefits(getFallbackBenefits());
        }
      } catch (error) {
        console.error('❌ Error fetching benefits:', error);
        setBenefits(getFallbackBenefits());
      } finally {
        setLoading(false);
      }
    };

    fetchBenefits();
  }, []);

  const getFallbackBenefits = (): Benefit[] => [
    {
      id: '1',
      title: 'Comprehensive Health Coverage',
      description: 'Full medical, dental, and vision insurance for you and your family.',
      icon: '🏥',
      category: 'health',
      highlights: ['100% premium coverage', 'Low deductible plans', 'Mental health support', 'Annual wellness stipend']
    },
    {
      id: '2',
      title: 'Competitive Equity Package',
      description: 'Own a piece of our success with stock options and equity participation.',
      icon: '📈',
      category: 'financial',
      highlights: ['Stock options', 'Equity refreshers', 'Financial planning assistance', '401k matching']
    },
    {
      id: '3',
      title: 'Learning & Development',
      description: 'Continuous learning opportunities to advance your career and skills.',
      icon: '📚',
      category: 'growth',
      highlights: ['$2,000 annual learning budget', 'Conference attendance', 'Internal mentorship', 'Skill certifications']
    },
    {
      id: '4',
      title: 'Flexible Work Arrangements',
      description: 'Work from anywhere with flexible hours that fit your lifestyle.',
      icon: '🌍',
      category: 'lifestyle',
      highlights: ['Remote-first culture', 'Flexible schedules', 'Home office stipend', 'Co-working space access']
    },
    {
      id: '5',
      title: 'Wellness Programs',
      description: 'Physical and mental wellness support to keep you at your best.',
      icon: '🧘',
      category: 'health',
      highlights: ['Gym membership reimbursement', 'Mental health days', 'Meditation apps', 'Wellness challenges']
    },
    {
      id: '6',
      title: 'Generous Time Off',
      description: 'Unlimited PTO policy with encouraged time off to recharge.',
      icon: '🏖️',
      category: 'lifestyle',
      highlights: ['Unlimited PTO', 'Paid holidays', 'Sabbatical options', 'Parental leave']
    }
  ];

  const categories = [
    { id: 'all', label: 'All Benefits', icon: '⭐' },
    { id: 'health', label: 'Health & Wellness', icon: '🏥' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'growth', label: 'Growth', icon: '📈' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🌟' },
    { id: 'general', label: 'General', icon: '🎯' }
  ];

  const filteredBenefits = activeCategory === 'all' 
    ? benefits 
    : benefits.filter(benefit => benefit.category === activeCategory);

  const toggleBenefit = (benefitId: string) => {
    setExpandedBenefit(expandedBenefit === benefitId ? null : benefitId);
  };

  return (
    <section className="benefits-perks" id="benefits">
      <div className="container">
        <div className="benefits-header">
          <h2 className="section-title">Benefits & Perks</h2>
          <p className="section-description">
            We believe in taking care of our team with comprehensive benefits that support 
            your health, growth, and work-life balance.
          </p>
        </div>

        {/* Category Filter */}
        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`filter-btn ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
              aria-label={`Filter benefits by ${category.label}`}
            >
              <span className="filter-icon" aria-hidden="true">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Benefits Grid */}
        {loading ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading benefits...</p>
          </div>
        ) : (
          <div className="benefits-grid">
            {filteredBenefits.map((benefit) => (
            <div 
              key={benefit.id} 
              className={`benefit-card ${expandedBenefit === benefit.id ? 'expanded' : ''}`}
              onClick={() => toggleBenefit(benefit.id)}
              role="button"
              tabIndex={0}
              aria-expanded={expandedBenefit === benefit.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleBenefit(benefit.id);
                }
              }}
            >
              <div className="benefit-header">
                <div className="benefit-icon" aria-hidden="true">
                  {benefit.icon}
                </div>
                <div className="benefit-content">
                  <h3 className="benefit-title">{benefit.title}</h3>
                  <p className="benefit-description">{benefit.description}</p>
                </div>
                <button 
                  className="expand-btn"
                  aria-label={expandedBenefit === benefit.id ? 'Collapse details' : 'Expand details'}
                >
                  <span className={`expand-icon ${expandedBenefit === benefit.id ? 'rotated' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>

              {expandedBenefit === benefit.id && (
                <div className="benefit-details">
                  <h4>What's Included:</h4>
                  <ul className="highlights-list">
                    {benefit.highlights?.map((highlight, index) => (
                      <li key={index} className="highlight-item">
                        <span className="check-icon" aria-hidden="true">✓</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        {/* Benefits Summary */}
        <div className="benefits-summary">
          <h3>Why Our Benefits Matter</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-icon">💝</div>
              <h4>Total Rewards</h4>
              <p>Our comprehensive package is designed to support your entire life, not just your work.</p>
            </div>
            <div className="summary-item">
              <div className="summary-icon">🎯</div>
              <h4>Personalized</h4>
              <p>Choose the benefits that work best for you and your family's unique needs.</p>
            </div>
            <div className="summary-item">
              <div className="summary-icon">🚀</div>
              <h4>Future-Focused</h4>
              <p>We continuously evolve our benefits to meet the changing needs of our team.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsPerks;
