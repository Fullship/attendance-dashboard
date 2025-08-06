/**
 * @file CareersPage.tsx
 * @description Modern, accessible, mobile-responsive career page with comprehensive sections
 */

import React, { useState, useEffect } from 'react';
// Using custom hook for document head management (React 19 compatible)
import { useDocumentHead } from '../hooks/useDocumentHead';
import { Job } from '../components/careers/types';
import HeroBanner from '../components/careers/HeroBanner';
import CompanyIntroduction from '../components/careers/CompanyIntroduction';
import EmployeeTestimonials from '../components/careers/EmployeeTestimonials';
import BenefitsPerks from '../components/careers/BenefitsPerks';
import JobListings from '../components/careers/JobListings';
import ApplicationForm from '../components/careers/ApplicationForm';
import FAQSection from '../components/careers/FAQSection';
import CareersFooter from '../components/careers/CareersFooter';
import SkipNavLink from '../components/careers/SkipNavLink';
import './CareersPage.css';

const CareersPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect user's color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Fetch jobs data
    const fetchJobs = async () => {
      try {
        // In a real app, this would be an API call
        const response = await fetch('/api/jobs');
        if (response.ok) {
          const jobsData = await response.json();
          setJobs(jobsData);
        } else {
          // Fallback to mock data
          const mockJobs = await import('../data/mockJobs.json');
          setJobs(mockJobs.default);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        // Load mock data as fallback
        const mockJobs = await import('../data/mockJobs.json');
        setJobs(mockJobs.default);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Analytics event tracking
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }
    
    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventName, properties);
    }
  };

  const handleApplyNowClick = (jobId?: string) => {
    trackEvent('careers_apply_now_clicked', {
      job_id: jobId,
      page: 'careers',
      timestamp: new Date().toISOString()
    });
  };

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Fullship Attendance Dashboard",
    "description": "Leading employee attendance management solutions",
    "url": "https://fullship.com",
    "logo": "https://fullship.com/logo.png",
    "jobPosting": jobs.map(job => ({
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "Fullship"
      },
      "jobLocation": {
        "@type": "Place",
        "name": job.location
      },
      "employmentType": job.type,
      "datePosted": job.postedDate
    }))
  };

  // Use custom hook for document head management
  useDocumentHead({
    title: "Careers - Join Our Team | Fullship",
    description: "Discover exciting career opportunities at Fullship. Build innovative attendance management solutions with a passionate team. Remote-friendly, competitive benefits, and growth opportunities.",
    keywords: "careers, jobs, software engineer, product manager, design, remote work, tech jobs",
    ogTitle: "Careers - Join Our Team | Fullship",
    ogDescription: "Discover exciting career opportunities at Fullship. Build innovative attendance management solutions with a passionate team.",
    ogImage: "https://fullship.com/images/careers-og.jpg",
    ogUrl: "https://fullship.com/careers",
    twitterTitle: "Careers - Join Our Team | Fullship",
    twitterDescription: "Discover exciting career opportunities at Fullship. Build innovative attendance management solutions with a passionate team.",
    twitterImage: "https://fullship.com/images/careers-og.jpg",
    twitterCard: "summary_large_image",
    structuredData
  });

  return (
    <div className={`careers-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <SkipNavLink />
      
      <main id="main-content" role="main">
        <HeroBanner onApplyClick={() => handleApplyNowClick()} />
        
        <CompanyIntroduction />
        
        <EmployeeTestimonials />
        
        <BenefitsPerks />
        
        <JobListings 
          jobs={jobs} 
          loading={loading}
          onApplyClick={handleApplyNowClick}
        />
        
        <ApplicationForm onSubmit={(data) => {
          trackEvent('careers_application_submitted', {
            position: data.position,
            location: data.location
          });
        }} />
        
        <FAQSection />
      </main>

      <CareersFooter />
    </div>
  );
};

export default CareersPage;