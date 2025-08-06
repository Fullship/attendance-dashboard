/**
 * @file JobListings.tsx
 * @description Job listings with filters and pagination
 */

import React, { useState, useMemo } from 'react';
import { Job } from './types';
import './JobListings.css';

interface JobListingsProps {
  jobs: Job[];
  loading: boolean;
  onApplyClick: (jobId: string) => void;
}

const JobListings: React.FC<JobListingsProps> = ({ jobs, loading, onApplyClick }) => {
  const [filters, setFilters] = useState({
    department: '',
    location: '',
    type: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 6;

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      return (
        (filters.department === '' || job.department === filters.department) &&
        (filters.location === '' || job.location.toLowerCase().includes(filters.location.toLowerCase())) &&
        (filters.type === '' || job.type === filters.type)
      );
    });
  }, [jobs, filters]);

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage);

  const departments = Array.from(new Set(jobs.map(job => job.department)));
  const jobTypes = Array.from(new Set(jobs.map(job => job.type)));

  if (loading) {
    return (
      <section className="job-listings" id="job-listings">
        <div className="container">
          <div className="loading-spinner">Loading jobs...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="job-listings" id="job-listings">
      <div className="container">
        <div className="jobs-header">
          <h2 className="section-title">Open Positions</h2>
          <p className="section-description">
            Join our team and help us build the future of workforce management.
          </p>
        </div>

        {/* Filters */}
        <div className="job-filters">
          <select 
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            aria-label="Filter by department"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search location..."
            value={filters.location}
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            aria-label="Filter by location"
          />

          <select 
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            aria-label="Filter by job type"
          >
            <option value="">All Types</option>
            {jobTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Job Cards */}
        <div className="jobs-grid">
          {currentJobs.map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h3 className="job-title">{job.title}</h3>
                <span className="job-type">{job.type}</span>
              </div>
              <div className="job-meta">
                <span className="job-department">{job.department}</span>
                <span className="job-location">{job.location}</span>
              </div>
              <p className="job-description">{job.description}</p>
              <button 
                className="apply-btn"
                onClick={() => onApplyClick(job.id)}
              >
                Apply Now
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default JobListings;
