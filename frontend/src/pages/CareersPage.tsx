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
  const [selectedJob, setSelectedJob] = useState<{ title: string; location: string } | null>(null);

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
    // Fetch real jobs data from admin-managed jobs
    const fetchJobs = async () => {
      try {
        console.log('🔄 Fetching jobs from public API...');
        const response = await fetch('/api/careers/jobs');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Jobs fetched successfully:', data.jobs);
          setJobs(data.jobs || []);
        } else {
          console.error('❌ Failed to fetch jobs, status:', response.status);
          // Fallback to mock data
          const mockJobs = await import('../data/mockJobs.json');
          setJobs(mockJobs.default);
        }
      } catch (error) {
        console.error('❌ Error fetching jobs:', error);
        // Load mock data as fallback
        try {
          const mockJobs = await import('../data/mockJobs.json');
          setJobs(mockJobs.default);
        } catch (mockError) {
          console.error('❌ Failed to load mock data:', mockError);
          setJobs([]);
        }
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

    // Find the selected job and set it for pre-filling the form
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === jobId || j.id.toString() === jobId);
      if (job) {
        setSelectedJob({
          title: job.title,
          location: job.location
        });
        
        // Scroll to the application form
        setTimeout(() => {
          const applicationForm = document.getElementById('application-form');
          if (applicationForm) {
            applicationForm.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
      }
    }
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
        
        <ApplicationForm 
          selectedJob={selectedJob}
          onClearSelection={() => setSelectedJob(null)}
          onSubmit={async (data) => {
          trackEvent('careers_application_submitted', {
            position: data.position,
            location: data.location
          });
          
          // Submit job application through the public API
          try {
            console.log('🚀 Submitting job application:', data);
            
            // Find the job ID based on the position title
            const selectedJob = jobs.find(job => 
              job.title === data.position || 
              job.title.toLowerCase().includes(data.position.toLowerCase())
            );
            
            if (!selectedJob) {
              throw new Error('Selected job position not found. Please refresh the page and try again.');
            }
            
            // Split the full name into first and last name
            const nameParts = data.name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('email', data.email);
            formData.append('location', data.location);
            formData.append('cover_letter', data.coverLetter);
            
            if (data.resume) {
              formData.append('resume', data.resume);
            }
            
            const response = await fetch(`/api/careers/jobs/${selectedJob.id}/apply`, {
              method: 'POST',
              body: formData, // Use FormData for file upload
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to submit application');
            }

            const result = await response.json();
            console.log('✅ Application submitted successfully:', result);
            
            // Show success message (handled by ApplicationForm component)
          } catch (error) {
            console.error('❌ Failed to submit application:', error);
            // Handle error - could show error message to user
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to submit application: ${errorMessage}`);
          }
        }} />
        
        <FAQSection />
      </main>

      <CareersFooter />
    </div>
  );
};

export default CareersPage;