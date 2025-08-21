/**
 * @file ApplicationForm.tsx
 * @description Job application form component
 */

import React, { useState } from 'react';
import './ApplicationForm.css';

interface ApplicationFormData {
  name: string;
  email: string;
  position: string;
  location: string;
  resume: File | null;
  coverLetter: string;
}

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => void;
  selectedJob?: {
    title: string;
    location: string;
  } | null;
  onClearSelection?: () => void;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({ onSubmit, selectedJob, onClearSelection }) => {
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: '',
    email: '',
    position: '',
    location: '',
    resume: null,
    coverLetter: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill form when a job is selected
  React.useEffect(() => {
    if (selectedJob) {
      setFormData(prev => ({
        ...prev,
        position: selectedJob.title,
        location: selectedJob.location
      }));
    }
  }, [selectedJob]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    } else if (formData.resume.size > 5 * 1024 * 1024) { // 5MB limit
      newErrors.resume = 'Resume file size must be less than 5MB';
    } else if (!['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(formData.resume.type)) {
      newErrors.resume = 'Resume must be PDF or Word document';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
      setSubmitted(true);
      // Reset form after submission
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          position: '',
          location: '',
          resume: null,
          coverLetter: ''
        });
        setSubmitted(false);
      }, 3000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, resume: file }));
  };

  if (submitted) {
    return (
      <section className="application-form" id="application-form">
        <div className="container">
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Application Submitted!</h2>
            <p>Thank you for your interest. We'll review your application and get back to you soon.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="application-form" id="application-form">
      <div className="container">
        <div className="form-header">
          <h2 className="section-title">Apply Now</h2>
          {selectedJob ? (
            <div className="selected-job-info" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: '500' }}>
                🎯 Applying for: <strong>{selectedJob.title}</strong> in {selectedJob.location}
              </p>
              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                >
                  ✕ Change Position
                </button>
              )}
            </div>
          ) : null}
          <p className="section-description">
            Ready to join our team? Submit your application and let's start the conversation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="application-form-container">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'error' : ''}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <span id="name-error" className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={errors.email ? 'error' : ''}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && <span id="email-error" className="error-message">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="position">Position of Interest *</label>
              <input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                className={errors.position ? 'error' : ''}
                aria-describedby={errors.position ? 'position-error' : undefined}
              />
              {errors.position && <span id="position-error" className="error-message">{errors.position}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="location">Preferred Location</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Remote, New York, San Francisco"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="resume">Resume *</label>
            <input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className={errors.resume ? 'error' : ''}
              aria-describedby={errors.resume ? 'resume-error' : undefined}
            />
            <small className="file-info">PDF or Word document, max 5MB</small>
            {errors.resume && <span id="resume-error" className="error-message">{errors.resume}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="coverLetter">Cover Letter</label>
            <textarea
              id="coverLetter"
              value={formData.coverLetter}
              onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
              placeholder="Tell us why you're interested in this role and what you'd bring to our team..."
              rows={6}
            />
          </div>

          <button type="submit" className="submit-btn">
            Submit Application
          </button>
        </form>
      </div>
    </section>
  );
};

export default ApplicationForm;
