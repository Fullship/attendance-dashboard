import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit2, 
  MapPin, 
  Users, 
  Briefcase, 
  Star,
  Trash2
} from 'lucide-react';
import ApplicationsView from './ApplicationsView';
import ContentManagement from './ContentManagement';

interface JobPosition {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  experience_level?: string;
  salary_range_min: number;
  salary_range_max: number;
  salary_currency: string;
  description: string;
  requirements: string;
  responsibilities?: string;
  benefits: string;
  is_remote?: boolean;
  is_active: boolean;
  featured?: boolean;
  application_deadline?: string;
  created_at: string;
  updated_at: string;
}

interface JobApplication {
  id: number;
  job_position_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  cover_letter?: string;
  resume_filename?: string;
  experience_years?: number;
  salary_expectation?: number;
  availability_date?: string;
  status: 'pending' | 'reviewing' | 'interviewed' | 'rejected' | 'hired';
  admin_notes?: string;
  job_title: string;
  department: string;
  job_location: string;
  created_at: string;
  reviewed_by_name?: string;
  reviewed_by_lastname?: string;
  reviewed_at?: string;
}

interface CareersAnalytics {
  jobs: {
    total_jobs: number;
    active_jobs: number;
    inactive_jobs: number;
  };
  applications: {
    total_applications: number;
    pending_applications: number;
    reviewed_applications: number;
    hired_applications: number;
  };
  departments: Array<{
    department: string;
    job_count: number;
    active_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    jobs_posted: number;
    applications_received: number;
  }>;
}

const CareersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applications' | 'content'>('overview');
  const [analytics, setAnalytics] = useState<CareersAnalytics | null>(null);
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showViewJobModal, setShowViewJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);

  // Form data for add/edit job
  const [jobFormData, setJobFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full-time',
    experience_level: 'mid',
    salary_range_min: '',
    salary_range_max: '',
    salary_currency: 'USD',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    is_remote: false,
    is_active: true,
    featured: false,
    application_deadline: ''
  });

  // Filters
  const [jobFilters, setJobFilters] = useState({
    search: '',
    department: '',
    location: '',
    type: '',
    is_active: 'all'
  });

  const [applicationFilters, setApplicationFilters] = useState({
    search: '',
    status: '',
    job_id: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadAnalytics();
      } else if (activeTab === 'jobs') {
        await loadJobs();
      } else if (activeTab === 'applications') {
        await loadApplications();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh analytics data
  const refreshAnalytics = async () => {
    if (analytics) {
      await loadAnalytics();
    }
  };

    const loadAnalytics = async () => {
    try {
      console.log('🔍 Loading analytics from:', '/api/admin/careers/analytics');
      const response = await fetch('/api/admin/careers/analytics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('📊 Analytics response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Analytics response error:', response.status, errorText);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Analytics data received:', data);
      setAnalytics(data);
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const params = new URLSearchParams(jobFilters);
      const response = await fetch(`/api/admin/careers/jobs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Backend returns { jobs: [...], pagination: {...} }
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]); // Set empty array on error to prevent .map() error
    }
  };

  const loadApplications = async () => {
    try {
      const params = new URLSearchParams(applicationFilters);
      const response = await fetch(`/api/admin/careers/applications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Backend returns { applications: [...], pagination: {...} }
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      setApplications([]); // Set empty array on error to prevent .map() error
    }
  };

  const formatSalary = (min: number, max: number, currency: string = 'USD') => {
    if (!min && !max) return 'Competitive';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      return `From ${formatter.format(min)}`;
    } else if (max) {
      return `Up to ${formatter.format(max)}`;
    }
    return 'Competitive';
  };

  // Modal handler functions
  const resetJobForm = () => {
    setJobFormData({
      title: '',
      department: '',
      location: '',
      type: 'full-time',
      experience_level: 'mid',
      salary_range_min: '',
      salary_range_max: '',
      salary_currency: 'USD',
      description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
      is_remote: false,
      is_active: true,
      featured: false,
      application_deadline: ''
    });
  };

  const handleAddJob = () => {
    resetJobForm();
    setShowAddJobModal(true);
  };

  const handleViewJob = (job: JobPosition) => {
    setSelectedJob(job);
    setShowViewJobModal(true);
  };

  const handleEditJob = (job: JobPosition) => {
    setSelectedJob(job);
    setJobFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experience_level: job.experience_level || 'mid',
      salary_range_min: job.salary_range_min.toString(),
      salary_range_max: job.salary_range_max.toString(),
      salary_currency: job.salary_currency,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities || '',
      benefits: job.benefits,
      is_remote: job.is_remote || false,
      is_active: job.is_active,
      featured: job.featured || false,
      application_deadline: job.application_deadline || ''
    });
    setShowEditJobModal(true);
  };

  const handleCloseModals = () => {
    setShowAddJobModal(false);
    setShowViewJobModal(false);
    setShowEditJobModal(false);
    setSelectedJob(null);
    resetJobForm();
  };

  const handleSaveJob = async (isEdit: boolean = false) => {
    try {
      setLoading(true);
      
      const url = isEdit 
        ? `/api/admin/careers/jobs/${selectedJob?.id}` 
        : '/api/admin/careers/jobs';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...jobFormData,
          salary_range_min: parseFloat(jobFormData.salary_range_min) || 0,
          salary_range_max: parseFloat(jobFormData.salary_range_max) || 0,
          // Convert empty date strings to null for database
          application_deadline: jobFormData.application_deadline || null
        })
      });

      if (response.ok) {
        handleCloseModals();
        await loadJobs(); // Refresh the jobs list
        // Refresh analytics if on overview tab
        if (activeTab === 'overview') {
          await loadAnalytics();
        }
        console.log('Job saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to save job:', errorData);
        alert(`Failed to save the job: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      alert(`Failed to save the job: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!window.confirm('Are you sure you want to delete this job position? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/careers/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (response.ok) {
        handleCloseModals();
        await loadJobs(); // Refresh the jobs list
        // Refresh analytics to reflect the deletion
        await loadAnalytics();
        console.log('Job deleted successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to delete job:', errorData);
        alert(`Failed to delete the job: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      alert(`Failed to delete the job: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        <button 
          onClick={refreshAnalytics}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Search className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && analytics.jobs && analytics.applications ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Briefcase className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.jobs?.total_jobs || 0}</p>
                  <p className="text-xs text-gray-500">{analytics.jobs?.active_jobs || 0} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Applications</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.applications?.total_applications || 0}</p>
                  <p className="text-xs text-gray-500">{analytics.applications?.pending_applications || 0} pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MapPin className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Departments</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.departments?.length || 0}</p>
                  <p className="text-xs text-gray-500">Active departments</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Hired</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.applications?.hired_applications || 0}</p>
                  <p className="text-xs text-gray-500">this period</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Statistics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Department Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jobs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Jobs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.departments?.map((dept) => (
                    <tr key={dept.department}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.job_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.active_count}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No department data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gray-300 rounded"></div>
                    </div>
                    <div className="ml-4 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                      <div className="h-6 bg-gray-300 rounded w-16"></div>
                      <div className="h-3 bg-gray-300 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-300 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderJobs = () => (
    <div className="space-y-6">
      {/* Jobs Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Job Positions</h2>
        <button 
          onClick={handleAddJob}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Job
        </button>
      </div>

      {/* Jobs Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              value={jobFilters.search}
              onChange={(e) => setJobFilters({ ...jobFilters, search: e.target.value })}
              className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={jobFilters.department}
              onChange={(e) => setJobFilters({ ...jobFilters, department: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              <option value="Technology">Technology</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={jobFilters.type}
              onChange={(e) => setJobFilters({ ...jobFilters, type: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={jobFilters.is_active}
              onChange={(e) => setJobFilters({ ...jobFilters, is_active: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadJobs}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="min-w-full divide-y divide-gray-200">
          {(!jobs || !Array.isArray(jobs) || jobs.length === 0) ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new job position.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {job.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatSalary(job.salary_range_min, job.salary_range_max, job.salary_currency)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        job.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {job.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewJob(job)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Job Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const handleStatusUpdate = async (applicationId: number, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/careers/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, admin_notes: notes })
      });

      if (response.ok) {
        await loadApplications(); // Refresh applications list
        console.log('Application status updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to update application status:', errorData);
        alert(`Failed to update status: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  const handleDownloadResume = async (applicationId: number, filename: string) => {
    try {
      const response = await fetch(`/api/admin/careers/applications/${applicationId}/resume`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error('Failed to download resume:', errorData);
        alert(`Failed to download resume: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert(`Failed to download resume: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  const renderApplications = () => (
    <ApplicationsView
      applications={applications}
      onStatusUpdate={handleStatusUpdate}
      onDownloadResume={handleDownloadResume}
      filters={applicationFilters}
      onFiltersChange={setApplicationFilters}
      onRefresh={loadApplications}
    />
  );

  const renderContent = () => (
    <ContentManagement />
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Careers Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage job positions, applications, and career page content
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Briefcase },
            { id: 'jobs', name: 'Job Positions', icon: MapPin },
            { id: 'applications', name: 'Applications', icon: Users },
            { id: 'content', name: 'Content', icon: Edit2 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'jobs' && renderJobs()}
          {activeTab === 'applications' && renderApplications()}
          {activeTab === 'content' && renderContent()}
        </>
      )}

      {/* Add Job Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Job Position</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={jobFormData.title}
                    onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={jobFormData.department}
                    onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    <option value="Technology">Technology</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                  <select
                    value={jobFormData.type}
                    onChange={(e) => setJobFormData({ ...jobFormData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                  <select
                    value={jobFormData.experience_level || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, experience_level: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Experience Level</option>
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                    <option value="Executive Level">Executive Level</option>
                  </select>
                </div>                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={jobFormData.location}
                    onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. New York, NY (Remote Available)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                  <input
                    type="number"
                    value={jobFormData.salary_range_min}
                    onChange={(e) => setJobFormData({ ...jobFormData, salary_range_min: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary</label>
                  <input
                    type="number"
                    value={jobFormData.salary_range_max}
                    onChange={(e) => setJobFormData({ ...jobFormData, salary_range_max: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="80000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={jobFormData.description}
                    onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Job description and responsibilities..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                  <textarea
                    value={jobFormData.requirements}
                    onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Required skills and qualifications..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                  <textarea
                    value={jobFormData.benefits}
                    onChange={(e) => setJobFormData({ ...jobFormData, benefits: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Benefits and perks..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={jobFormData.is_active}
                      onChange={(e) => setJobFormData({ ...jobFormData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Active (visible to applicants)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseModals}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveJob(false)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Job Position</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={jobFormData.title}
                    onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={jobFormData.department}
                    onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    <option value="Technology">Technology</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                  <select
                    value={jobFormData.type}
                    onChange={(e) => setJobFormData({ ...jobFormData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                  <select
                    value={jobFormData.experience_level || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, experience_level: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Experience Level</option>
                    <option value="Entry Level">Entry Level</option>
                    <option value="Mid Level">Mid Level</option>
                    <option value="Senior Level">Senior Level</option>
                    <option value="Executive Level">Executive Level</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={jobFormData.location}
                    onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                  <input
                    type="number"
                    value={jobFormData.salary_range_min}
                    onChange={(e) => setJobFormData({ ...jobFormData, salary_range_min: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary</label>
                  <input
                    type="number"
                    value={jobFormData.salary_range_max}
                    onChange={(e) => setJobFormData({ ...jobFormData, salary_range_max: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={jobFormData.description}
                    onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                  <textarea
                    value={jobFormData.requirements}
                    onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                  <textarea
                    value={jobFormData.benefits}
                    onChange={(e) => setJobFormData({ ...jobFormData, benefits: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={jobFormData.is_active}
                      onChange={(e) => setJobFormData({ ...jobFormData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Active (visible to applicants)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseModals}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveJob(true)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Job Modal */}
      {showViewJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    handleCloseModals();
                    handleEditJob(selectedJob);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteJob(selectedJob.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h4>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {selectedJob.location}
                    </span>
                    <span>{selectedJob.department}</span>
                    <span>{selectedJob.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedJob.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedJob.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-medium text-green-600">
                    {formatSalary(selectedJob.salary_range_min, selectedJob.salary_range_max, selectedJob.salary_currency)}
                  </div>
                </div>

                {selectedJob.description && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.description}</p>
                  </div>
                )}

                {selectedJob.requirements && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Requirements</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.requirements}</p>
                  </div>
                )}

                {selectedJob.benefits && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Benefits</h5>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedJob.benefits}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>Created: {new Date(selectedJob.created_at).toLocaleDateString()}</p>
                  <p>Updated: {new Date(selectedJob.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseModals}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareersManagement;
