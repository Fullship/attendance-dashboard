import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';

interface LeaveRequest {
  id: number;
  userId: number;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    locationId?: number;
    teamId?: number;
  };
  location?: {
    name: string;
    timezone: string;
  };
  team?: {
    name: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  halfDayPeriod?: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes?: string;
  supportingDocumentPath?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewer?: {
    firstName: string;
    lastName: string;
  };
}

interface LeaveStats {
  year: number;
  overall: {
    total_requests: string;
    pending_requests: string;
    approved_requests: string;
    rejected_requests: string;
    total_approved_days: string;
  };
  byType: Array<{
    leave_type: string;
    count: string;
    approved_days: string;
  }>;
}

const ReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: 'approve' | 'reject', adminNotes: string) => void;
  request: LeaveRequest | null;
}> = ({ isOpen, onClose, onSubmit, request }) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(action, adminNotes);
    setAdminNotes('');
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Review Leave Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Request Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Request Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Employee:</strong> {request.employee.firstName} {request.employee.lastName}
            </div>
            <div>
              <strong>Employee ID:</strong> {request.employee.employeeId}
            </div>
            <div>
              <strong>Leave Type:</strong> {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
            </div>
            <div>
              <strong>Duration:</strong> {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
            </div>
            <div>
              <strong>Dates:</strong> {request.startDate} to {request.endDate}
              {request.halfDay && ` (${request.halfDayPeriod} half-day)`}
            </div>
            <div>
              <strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}
            </div>
            {request.location && (
              <div>
                <strong>Location:</strong> {request.location.name}
              </div>
            )}
            {request.team && (
              <div>
                <strong>Team:</strong> {request.team.name}
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <strong>Reason:</strong>
            <p className="mt-1 text-gray-600">{request.reason}</p>
          </div>

          {request.emergencyContactName && (
            <div className="mt-4">
              <strong>Emergency Contact:</strong> {request.emergencyContactName}
              {request.emergencyContactPhone && ` (${request.emergencyContactPhone})`}
            </div>
          )}
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                  className="mr-2"
                />
                <span className="text-green-600">Approve</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                  className="mr-2"
                />
                <span className="text-red-600">Reject</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about your decision..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminLeaveManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    locationId: 'all',
    teamId: 'all',
    year: new Date().getFullYear().toString()
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveStats();
  }, [filters, pagination.page]);

  const fetchLeaveRequests = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all' && value !== '') {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/admin/leave-requests?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setLeaveRequests(data.leaveRequests);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchLeaveStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.year !== 'all') params.append('year', filters.year);
      if (filters.locationId !== 'all') params.append('locationId', filters.locationId);
      if (filters.teamId !== 'all') params.append('teamId', filters.teamId);

      const response = await fetch(`/api/admin/leave-requests/stats?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setLeaveStats(data);
      }
    } catch (error) {
      console.error('Error fetching leave stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (action: 'approve' | 'reject', adminNotes: string) => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(`/api/admin/leave-requests/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, adminNotes })
      });

      const data = await response.json();

      if (response.ok) {
        setShowReviewModal(false);
        setSelectedRequest(null);
        fetchLeaveRequests();
        fetchLeaveStats();
        alert(`Leave request ${action}d successfully!`);
      } else {
        alert(data.message || `Error ${action}ing leave request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing leave request:`, error);
      alert(`Error ${action}ing leave request`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLeaveType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
      </div>

      {/* Statistics Cards */}
      {leaveStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Total Requests</h3>
            <div className="text-2xl font-bold text-blue-600">
              {leaveStats.overall.total_requests}
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Pending</h3>
            <div className="text-2xl font-bold text-yellow-600">
              {leaveStats.overall.pending_requests}
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Approved</h3>
            <div className="text-2xl font-bold text-green-600">
              {leaveStats.overall.approved_requests}
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Rejected</h3>
            <div className="text-2xl font-bold text-red-600">
              {leaveStats.overall.rejected_requests}
            </div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">Total Days</h3>
            <div className="text-2xl font-bold text-purple-600">
              {parseFloat(leaveStats.overall.total_approved_days).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Approved</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={filters.leaveType}
              onChange={(e) => setFilters(prev => ({ ...prev, leaveType: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="emergency">Emergency</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
              <option value="bereavement">Bereavement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Filters</label>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={filters.status === 'pending' ? 'primary' : 'secondary'}
                onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
              >
                Pending Review
              </Button>
              <Button
                size="sm"
                variant={filters.status === 'all' ? 'primary' : 'secondary'}
                onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              >
                All Requests
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Requests List */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Requests</h2>
          
          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No leave requests found</p>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {request.employee.firstName} {request.employee.lastName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({request.employee.employeeId})
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <strong>Type:</strong> {formatLeaveType(request.leaveType)}
                        </div>
                        <div>
                          <strong>Dates:</strong> {request.startDate} to {request.endDate}
                          {request.halfDay && ` (${request.halfDayPeriod})`}
                        </div>
                        <div>
                          <strong>Duration:</strong> {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                        </div>
                        <div>
                          <strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {(request.location || request.team) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                          {request.location && (
                            <div>
                              <strong>Location:</strong> {request.location.name}
                            </div>
                          )}
                          {request.team && (
                            <div>
                              <strong>Team:</strong> {request.team.name}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <strong className="text-sm text-gray-700">Reason:</strong>
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                      </div>

                      {request.adminNotes && (
                        <div className="mt-2">
                          <strong className="text-sm text-gray-700">Admin Notes:</strong>
                          <p className="text-sm text-gray-600 mt-1">{request.adminNotes}</p>
                        </div>
                      )}

                      {request.reviewer && (
                        <div className="mt-2 text-sm text-gray-500">
                          Reviewed by: {request.reviewer.firstName} {request.reviewer.lastName}
                          {request.reviewedAt && ` on ${new Date(request.reviewedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleReviewRequest(request)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleSubmitReview}
        request={selectedRequest}
      />
    </div>
  );
};

export default AdminLeaveManagement;
