import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  ExternalLink,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users
} from 'lucide-react';

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

interface ApplicationsViewProps {
  applications: JobApplication[];
  onStatusUpdate: (applicationId: number, status: string, notes?: string) => void;
  onDownloadResume: (applicationId: number, filename: string) => void;
  filters: {
    search: string;
    status: string;
    job_id: string;
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}

const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onStatusUpdate,
  onDownloadResume,
  filters,
  onFiltersChange,
  onRefresh
}) => {
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [jobs, setJobs] = useState<Array<{ id: number; title: string; department: string }>>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/admin/careers/jobs?status=all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setJobs(data.jobs.map((job: any) => ({
        id: job.id,
        title: job.title,
        department: job.department
      })));
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'reviewing':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'interviewed':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'hired':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      interviewed: 'bg-purple-100 text-purple-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (selectedApplication) {
      onStatusUpdate(selectedApplication.id, newStatus, statusNotes);
      setShowModal(false);
      setStatusNotes('');
      setSelectedApplication(null);
    }
  };

  const openApplicationModal = (application: JobApplication) => {
    setSelectedApplication(application);
    setStatusNotes(application.admin_notes || '');
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Applications Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Job Applications</h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search applicants..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="interviewed">Interviewed</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
            <select
              value={filters.job_id}
              onChange={(e) => onFiltersChange({ ...filters, job_id: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Positions</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.department}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={onRefresh}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">Applications will appear here when candidates apply.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <Mail className="h-3 w-3" />
                            <span>{application.email}</span>
                          </div>
                          {application.phone && (
                            <div className="text-sm text-gray-500 flex items-center space-x-2">
                              <Phone className="h-3 w-3" />
                              <span>{application.phone}</span>
                            </div>
                          )}
                          {application.location && (
                            <div className="text-sm text-gray-500 flex items-center space-x-2">
                              <MapPin className="h-3 w-3" />
                              <span>{application.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{application.job_title}</div>
                      <div className="text-sm text-gray-500">{application.department}</div>
                      <div className="text-sm text-gray-500">{application.job_location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {application.experience_years ? `${application.experience_years} years` : 'Not specified'}
                      </div>
                      {application.salary_expectation && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${application.salary_expectation.toLocaleString()}
                        </div>
                      )}
                      {application.availability_date && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(application.availability_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(application.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </div>
                      {application.reviewed_by_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          by {application.reviewed_by_name} {application.reviewed_by_lastname}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openApplicationModal(application)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {application.resume_filename && (
                          <button
                            onClick={() => onDownloadResume(application.id, application.resume_filename!)}
                            className="text-green-600 hover:text-green-900"
                            title="Download Resume"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        {application.portfolio_url && (
                          <a
                            href={application.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-900"
                            title="View Portfolio"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {application.linkedin_url && (
                          <a
                            href={application.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            title="View LinkedIn"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Application Details: {selectedApplication.first_name} {selectedApplication.last_name}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Applicant Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {selectedApplication.email}
                    </div>
                    {selectedApplication.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedApplication.phone}
                      </div>
                    )}
                    {selectedApplication.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {selectedApplication.location}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Professional Details</h4>
                  <div className="space-y-2">
                    {selectedApplication.experience_years && (
                      <div className="text-sm text-gray-600">
                        <strong>Experience:</strong> {selectedApplication.experience_years} years
                      </div>
                    )}
                    {selectedApplication.salary_expectation && (
                      <div className="text-sm text-gray-600">
                        <strong>Salary Expectation:</strong> ${selectedApplication.salary_expectation.toLocaleString()}
                      </div>
                    )}
                    {selectedApplication.availability_date && (
                      <div className="text-sm text-gray-600">
                        <strong>Available From:</strong> {formatDate(selectedApplication.availability_date)}
                      </div>
                    )}
                  </div>
                </div>

                {selectedApplication.cover_letter && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Cover Letter</h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md max-h-48 overflow-y-auto">
                      {selectedApplication.cover_letter}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Status Management */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Current Status</h4>
                  <div className="flex items-center mb-4">
                    {getStatusIcon(selectedApplication.status)}
                    <span className={`ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedApplication.status)}`}>
                      {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Update Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending', 'reviewing', 'interviewed', 'hired', 'rejected'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className={`px-3 py-2 text-xs font-medium rounded-md border ${
                            selectedApplication.status === status
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={4}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Add notes about this application..."
                  />
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Documents & Links</h4>
                  <div className="space-y-2">
                    {selectedApplication.resume_filename && (
                      <button
                        onClick={() => onDownloadResume(selectedApplication.id, selectedApplication.resume_filename!)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </button>
                    )}
                    {selectedApplication.portfolio_url && (
                      <a
                        href={selectedApplication.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Portfolio
                      </a>
                    )}
                    {selectedApplication.linkedin_url && (
                      <a
                        href={selectedApplication.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (selectedApplication) {
                    onStatusUpdate(selectedApplication.id, selectedApplication.status, statusNotes);
                    setShowModal(false);
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsView;
