/**
 * @file FAQSection.tsx
 * @description FAQ section about hiring process
 */

import React, { useState } from 'react';
import './FAQSection.css';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const FAQSection: React.FC = () => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'What is your hiring process like?',
      answer: 'Our hiring process typically includes: (1) Application review, (2) Initial phone/video screening, (3) Technical assessment or case study, (4) Team interviews, (5) Final interview with leadership, and (6) Reference checks. The entire process usually takes 2-3 weeks.'
    },
    {
      id: '2',
      question: 'Do you offer remote work opportunities?',
      answer: 'Yes! We are a remote-first company with team members working from over 40 countries. We also have physical offices in major cities for those who prefer in-person collaboration. All roles can be performed remotely unless specifically noted otherwise.'
    },
    {
      id: '3',
      question: 'What technologies do you use?',
      answer: 'Our tech stack includes React, TypeScript, Node.js, PostgreSQL, Redis, Docker, and AWS. We believe in using the right tool for the job and are always evaluating new technologies that can help us serve our customers better.'
    },
    {
      id: '4',
      question: 'How do you support career growth?',
      answer: 'We provide each employee with a $2,000 annual learning budget, access to conferences and training, internal mentorship programs, regular career development conversations, and opportunities to work on challenging projects across different areas of the business.'
    },
    {
      id: '5',
      question: 'What is your commitment to diversity and inclusion?',
      answer: 'Diversity and inclusion are core to our values. We are committed to creating an environment where everyone feels welcome, valued, and empowered to do their best work. We actively work to eliminate bias in our hiring process and regularly review our practices to ensure equity and inclusion.'
    },
    {
      id: '6',
      question: 'How long does it take to hear back after applying?',
      answer: 'We aim to respond to all applications within one week. If your background aligns with what we are looking for, our talent team will reach out to schedule an initial conversation. Even if the timing is not right for a specific role, we may keep your information for future opportunities.'
    }
  ];

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="faq-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-description">
            Got questions about working at Fullship? Find answers to the most common questions about our hiring process and workplace culture.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              className={`faq-item ${expandedFAQ === faq.id ? 'expanded' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => toggleFAQ(faq.id)}
                aria-expanded={expandedFAQ === faq.id}
                aria-controls={`faq-answer-${faq.id}`}
              >
                <span className="question-text">{faq.question}</span>
                <span className={`expand-icon ${expandedFAQ === faq.id ? 'rotated' : ''}`}>
                  ▼
                </span>
              </button>
              
              <div 
                id={`faq-answer-${faq.id}`}
                className="faq-answer"
                aria-hidden={expandedFAQ !== faq.id}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="faq-footer">
          <h3>Still have questions?</h3>
          <p>We would love to hear from you. Reach out to our talent team at <a href="mailto:careers@fullship.com">careers@fullship.com</a></p>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
