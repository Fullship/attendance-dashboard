/**
 * @file EmployeeTestimonials.tsx
 * @description Employee testimonials and video spotlights section
 */

import React, { useState, useEffect } from 'react';
import './EmployeeTestimonials.css';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  photo: string;
  quote: string;
  videoUrl?: string;
  department: string;
  yearsAtCompany?: number;
  rating?: number;
}

const EmployeeTestimonials: React.FC = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        console.log('🔄 Fetching testimonials from admin-managed data...');
        const response = await fetch('/api/careers/testimonials');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Testimonials fetched successfully:', data.testimonials);
          
          // Transform admin data to component format
          const transformedTestimonials: Testimonial[] = data.testimonials.map((testimonial: any, index: number) => ({
            id: index.toString(),
            name: testimonial.employee_name,
            role: testimonial.job_title,
            photo: testimonial.photo_url || '/images/employees/default.jpg',
            quote: testimonial.testimonial_text,
            department: testimonial.department,
            rating: testimonial.rating,
            yearsAtCompany: Math.floor(Math.random() * 5) + 1 // Placeholder since not in admin data
          }));
          
          setTestimonials(transformedTestimonials);
        } else {
          console.error('❌ Failed to fetch testimonials, using fallback data');
          setTestimonials(getFallbackTestimonials());
        }
      } catch (error) {
        console.error('❌ Error fetching testimonials:', error);
        setTestimonials(getFallbackTestimonials());
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const getFallbackTestimonials = (): Testimonial[] => [
    {
      id: '1',
      name: 'Sarah Chen',
      role: 'Senior Software Engineer',
      photo: '/images/employees/sarah-chen.jpg',
      quote: 'Working at Fullship has been transformative for my career. The team truly values innovation and gives you the freedom to explore new technologies while solving real-world problems.',
      videoUrl: '/videos/sarah-day-in-life.mp4',
      department: 'Engineering',
      yearsAtCompany: 3
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      role: 'Product Manager',
      photo: '/images/employees/marcus-johnson.jpg',
      quote: 'The collaborative culture here is incredible. Every voice is heard, and we genuinely work together to build products that make a difference in people\'s work lives.',
      department: 'Product',
      yearsAtCompany: 2
    },
    {
      id: '3',
      name: 'Priya Patel',
      role: 'UX Designer',
      photo: '/images/employees/priya-patel.jpg',
      quote: 'I love how design-driven this company is. We prioritize user experience in everything we do, and there\'s always support for professional growth and learning.',
      videoUrl: '/videos/priya-design-process.mp4',
      department: 'Design',
      yearsAtCompany: 1.5
    },
    {
      id: '4',
      name: 'Alex Rodriguez',
      role: 'DevOps Engineer',
      photo: '/images/employees/alex-rodriguez.jpg',
      quote: 'The work-life balance here is exceptional. I can be productive while still having time for my family and personal interests. Plus, the remote-first culture works perfectly.',
      department: 'Infrastructure',
      yearsAtCompany: 4
    }
  ];

  const handleVideoPlay = (testimonialId: string) => {
    setVideoPlaying(testimonialId);
  };

  const handleVideoClose = () => {
    setVideoPlaying(null);
  };

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="employee-testimonials" id="testimonials">
      <div className="container">
        <div className="testimonials-header">
          <h2 className="section-title">Hear From Our Team</h2>
          <p className="section-description">
            Discover what it\'s really like to work at Fullship through the eyes of our team members.
          </p>
        </div>

        {loading ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading testimonials...</p>
          </div>
        ) : testimonials.length === 0 ? (
          <div className="no-testimonials" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No testimonials available at the moment.</p>
          </div>
        ) : (
          <>
            {/* Featured Testimonial Carousel */}
            <div className="featured-testimonial">
          <div className="testimonial-content">
            <div className="testimonial-card">
              <div className="quote-mark" aria-hidden="true">"</div>
              <blockquote className="testimonial-quote">
                {testimonials[activeTestimonial].quote}
              </blockquote>
              
              <div className="testimonial-author">
                <img 
                  src={testimonials[activeTestimonial].photo}
                  alt={`${testimonials[activeTestimonial].name}, ${testimonials[activeTestimonial].role}`}
                  className="author-photo"
                  loading="lazy"
                />
                <div className="author-info">
                  <h4 className="author-name">{testimonials[activeTestimonial].name}</h4>
                  <p className="author-role">{testimonials[activeTestimonial].role}</p>
                  <p className="author-tenure">
                    {testimonials[activeTestimonial].yearsAtCompany} years at Fullship
                  </p>
                </div>
              </div>

              {testimonials[activeTestimonial].videoUrl && (
                <button 
                  className="video-play-btn"
                  onClick={() => handleVideoPlay(testimonials[activeTestimonial].id)}
                  aria-label={`Watch video spotlight with ${testimonials[activeTestimonial].name}`}
                >
                  <span className="play-icon" aria-hidden="true">▶</span>
                  Watch Video Spotlight
                </button>
              )}
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="carousel-controls">
            <button 
              className="carousel-btn prev"
              onClick={prevTestimonial}
              aria-label="Previous testimonial"
            >
              ‹
            </button>
            <button 
              className="carousel-btn next"
              onClick={nextTestimonial}
              aria-label="Next testimonial"
            >
              ›
            </button>
          </div>

          {/* Testimonial Indicators */}
          <div className="testimonial-indicators">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === activeTestimonial ? 'active' : ''}`}
                onClick={() => setActiveTestimonial(index)}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* All Testimonials Grid */}
        <div className="testimonials-grid">
          <h3 className="grid-title">More From Our Team</h3>
          <div className="grid-container">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="testimonial-mini-card">
                <img 
                  src={testimonial.photo}
                  alt={`${testimonial.name}`}
                  className="mini-photo"
                  loading="lazy"
                />
                <div className="mini-content">
                  <h4 className="mini-name">{testimonial.name}</h4>
                  <p className="mini-role">{testimonial.role}</p>
                  <p className="mini-department">{testimonial.department}</p>
                  {testimonial.videoUrl && (
                    <button 
                      className="mini-video-btn"
                      onClick={() => handleVideoPlay(testimonial.id)}
                      aria-label={`Watch ${testimonial.name}'s video`}
                    >
                      <span className="mini-play-icon" aria-hidden="true">▶</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {/* Video Modal */}
        {videoPlaying && (
          <div className="video-modal" onClick={handleVideoClose}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="video-close-btn"
                onClick={handleVideoClose}
                aria-label="Close video"
              >
                ×
              </button>
              <video 
                controls 
                autoPlay
                className="modal-video"
                aria-label="Employee video spotlight"
              >
                <source 
                  src={testimonials.find(t => t.id === videoPlaying)?.videoUrl} 
                  type="video/mp4" 
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default EmployeeTestimonials;
