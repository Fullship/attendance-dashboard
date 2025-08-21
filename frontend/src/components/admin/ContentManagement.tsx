import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';

interface CareersContent {
  id: number;
  section_name: string;
  title: string;
  subtitle?: string;
  content_html: string;
  content_json?: any;
  media_urls?: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

interface CompanyBenefit {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
}

interface EmployeeTestimonial {
  id: number;
  employee_name: string;
  job_title: string;
  position: string;
  department: string;
  testimonial_text: string;
  content: string;
  photo_url?: string;
  rating?: number;
  is_featured?: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
}

const ContentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'benefits' | 'testimonials'>('content');
  const [loading, setLoading] = useState(true);
  
  // Content state
  const [contentSections, setContentSections] = useState<CareersContent[]>([]);
  const [editingContent, setEditingContent] = useState<CareersContent | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  
  // Benefits state
  const [benefits, setBenefits] = useState<CompanyBenefit[]>([]);
  const [editingBenefit, setEditingBenefit] = useState<CompanyBenefit | null>(null);
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  
  // Testimonials state
  const [testimonials, setTestimonials] = useState<EmployeeTestimonial[]>([]);
  const [editingTestimonial, setEditingTestimonial] = useState<EmployeeTestimonial | null>(null);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'content') {
        await loadContentSections();
      } else if (activeTab === 'benefits') {
        await loadBenefits();
      } else if (activeTab === 'testimonials') {
        await loadTestimonials();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContentSections = async () => {
    try {
      const response = await fetch('/api/admin/careers/content', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setContentSections(data.content);
    } catch (error) {
      console.error('Error loading content sections:', error);
    }
  };

  const loadBenefits = async () => {
    try {
      const response = await fetch('/api/admin/careers/benefits', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setBenefits(data.benefits);
    } catch (error) {
      console.error('Error loading benefits:', error);
    }
  };

  const loadTestimonials = async () => {
    try {
      const response = await fetch('/api/admin/careers/testimonials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setTestimonials(data.testimonials);
    } catch (error) {
      console.error('Error loading testimonials:', error);
    }
  };

  const handleContentSave = async (contentData: Partial<CareersContent>) => {
    try {
      const url = editingContent 
        ? `/api/admin/careers/content/${editingContent.id}` 
        : '/api/admin/careers/content';
      const method = editingContent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(contentData)
      });

      if (response.ok) {
        await loadContentSections();
        setShowContentModal(false);
        setEditingContent(null);
      }
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  const handleBenefitSave = async (benefitData: Partial<CompanyBenefit>) => {
    try {
      const url = editingBenefit 
        ? `/api/admin/careers/benefits/${editingBenefit.id}` 
        : '/api/admin/careers/benefits';
      const method = editingBenefit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(benefitData)
      });

      if (response.ok) {
        await loadBenefits();
        setShowBenefitModal(false);
        setEditingBenefit(null);
      }
    } catch (error) {
      console.error('Error saving benefit:', error);
    }
  };

  const handleTestimonialSave = async (testimonialData: Partial<EmployeeTestimonial>) => {
    try {
      const url = editingTestimonial 
        ? `/api/admin/careers/testimonials/${editingTestimonial.id}` 
        : '/api/admin/careers/testimonials';
      const method = editingTestimonial ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(testimonialData)
      });

      if (response.ok) {
        await loadTestimonials();
        setShowTestimonialModal(false);
        setEditingTestimonial(null);
      }
    } catch (error) {
      console.error('Error saving testimonial:', error);
    }
  };

  const handleDelete = async (type: 'content' | 'benefits' | 'testimonials', id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/admin/careers/${type}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const toggleStatus = async (type: 'content' | 'benefits' | 'testimonials', id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/careers/${type}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const renderContentSections = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Content Sections</h3>
        <button
          onClick={() => {
            setEditingContent(null);
            setShowContentModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {contentSections.map((section) => (
            <li key={section.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">{section.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Order: {section.display_order}</span>
                      <button
                        onClick={() => toggleStatus('content', section.id, section.is_active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          section.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {section.is_active ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{section.section_name}</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{section.content_html}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingContent(section);
                      setShowContentModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('content', section.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderBenefits = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Company Benefits</h3>
        <button
          onClick={() => {
            setEditingBenefit(null);
            setShowBenefitModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Benefit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{benefit.icon}</div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleStatus('benefits', benefit.id, benefit.is_active)}
                  className={`p-1 rounded ${
                    benefit.is_active ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {benefit.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingBenefit(benefit);
                    setShowBenefitModal(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete('benefits', benefit.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">{benefit.title}</h4>
            <p className="text-sm text-gray-600">{benefit.description}</p>
            <div className="mt-4 text-xs text-gray-500">Order: {benefit.display_order}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTestimonials = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Employee Testimonials</h3>
        <button
          onClick={() => {
            setEditingTestimonial(null);
            setShowTestimonialModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {testimonial.photo_url ? (
                    <img 
                      className="h-10 w-10 rounded-full" 
                      src={testimonial.photo_url} 
                      alt={testimonial.employee_name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {testimonial.employee_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{testimonial.employee_name}</p>
                  <p className="text-sm text-gray-500">{testimonial.job_title || testimonial.position}</p>
                  <p className="text-xs text-gray-500">{testimonial.department}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleStatus('testimonials', testimonial.id, testimonial.is_active)}
                  className={`p-1 rounded ${
                    testimonial.is_active ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {testimonial.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setEditingTestimonial(testimonial);
                    setShowTestimonialModal(true);
                  }}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete('testimonials', testimonial.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <blockquote className="text-sm text-gray-600 italic">"{testimonial.testimonial_text || testimonial.content}"</blockquote>
            <div className="mt-4 text-xs text-gray-500">Order: {testimonial.display_order}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'content', label: 'Content Sections' },
            { id: 'benefits', label: 'Benefits' },
            { id: 'testimonials', label: 'Testimonials' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'content' && renderContentSections()}
          {activeTab === 'benefits' && renderBenefits()}
          {activeTab === 'testimonials' && renderTestimonials()}
        </div>
      )}

      {/* Modals */}
      <ContentModal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        content={editingContent}
        onSave={handleContentSave}
      />

      <BenefitModal
        isOpen={showBenefitModal}
        onClose={() => setShowBenefitModal(false)}
        benefit={editingBenefit}
        onSave={handleBenefitSave}
      />

      <TestimonialModal
        isOpen={showTestimonialModal}
        onClose={() => setShowTestimonialModal(false)}
        testimonial={editingTestimonial}
        onSave={handleTestimonialSave}
      />
    </div>
  );
};

// Content Modal Component
const ContentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  content: CareersContent | null;
  onSave: (data: Partial<CareersContent>) => void;
}> = ({ isOpen, onClose, content, onSave }) => {
  const [formData, setFormData] = useState({
    section_name: '',
    title: '',
    subtitle: '',
    content_html: '',
    display_order: 1,
    is_active: true
  });

  useEffect(() => {
    if (content) {
      setFormData({
        section_name: content.section_name,
        title: content.title,
        subtitle: content.subtitle || '',
        content_html: content.content_html,
        display_order: content.display_order,
        is_active: content.is_active
      });
    } else {
      setFormData({
        section_name: '',
        title: '',
        subtitle: '',
        content_html: '',
        display_order: 1,
        is_active: true
      });
    }
  }, [content, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {content ? 'Edit Content Section' : 'Add Content Section'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
            <input
              type="text"
              value={formData.section_name}
              onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., hero, about, culture"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (HTML)</label>
            <textarea
              value={formData.content_html}
              onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
              rows={6}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="HTML content for this section"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="1"
                required
              />
            </div>

            <div className="flex items-center mt-6">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {content ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Benefit Modal Component
const BenefitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  benefit: CompanyBenefit | null;
  onSave: (data: Partial<CompanyBenefit>) => void;
}> = ({ isOpen, onClose, benefit, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '🎯',
    display_order: 1,
    is_active: true
  });

  useEffect(() => {
    if (benefit) {
      setFormData({
        title: benefit.title,
        description: benefit.description,
        icon: benefit.icon,
        display_order: benefit.display_order,
        is_active: benefit.is_active
      });
    } else {
      setFormData({
        title: '',
        description: '',
        icon: '🎯',
        display_order: 1,
        is_active: true
      });
    }
  }, [benefit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  const commonIcons = ['🎯', '💼', '🏥', '🏖️', '📚', '💰', '🚀', '🌟', '⚡', '🎨', '🔧', '💡'];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {benefit ? 'Edit Benefit' : 'Add Benefit'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {commonIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-2 text-2xl text-center border rounded ${
                    formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Or enter custom emoji/icon"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="1"
                required
              />
            </div>

            <div className="flex items-center mt-6">
              <input
                id="benefit_is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="benefit_is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {benefit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Testimonial Modal Component
const TestimonialModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  testimonial: EmployeeTestimonial | null;
  onSave: (data: Partial<EmployeeTestimonial>) => void;
}> = ({ isOpen, onClose, testimonial, onSave }) => {
  const [formData, setFormData] = useState({
    employee_name: '',
    position: '',
    department: '',
    content: '',
    photo_url: '',
    display_order: 1,
    is_active: true
  });

  useEffect(() => {
    if (testimonial) {
      setFormData({
        employee_name: testimonial.employee_name,
        position: testimonial.position,
        department: testimonial.department,
        content: testimonial.testimonial_text || testimonial.content,
        photo_url: testimonial.photo_url || '',
        display_order: testimonial.display_order,
        is_active: testimonial.is_active
      });
    } else {
      setFormData({
        employee_name: '',
        position: '',
        department: '',
        content: '',
        photo_url: '',
        display_order: 1,
        is_active: true
      });
    }
  }, [testimonial, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {testimonial ? 'Edit Testimonial' : 'Add Testimonial'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
              <input
                type="text"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="What does this employee say about working here?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (Optional)</label>
            <input
              type="url"
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="1"
                required
              />
            </div>

            <div className="flex items-center mt-6">
              <input
                id="testimonial_is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="testimonial_is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {testimonial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentManagement;
