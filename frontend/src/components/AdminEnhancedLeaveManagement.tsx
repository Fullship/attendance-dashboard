import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

interface LeaveRequest {
  id: number;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    teamId: number;
    teamName: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  halfDayPeriod?: string;
  totalDays: number;
  reason: string;
  status: string;
  leaveCategory: string;
  isWeekendLeave: boolean;
  semiAnnualPeriod: number;
  teamConflictCheck: boolean;
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

interface LeaveStatistics {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

interface LeaveAnalytics {
  monthlyTrends: Array<{
    month: number;
    totalRequests: number;
    approvedRequests: number;
    totalDaysTaken: number;
  }>;
  leaveTypeBreakdown: Array<{
    leaveType: string;
    totalRequests: number;
    approvedRequests: number;
    totalDaysTaken: number;
  }>;
  teamAnalytics: Array<{
    teamName: string;
    totalRequests: number;
    approvedRequests: number;
    totalDaysTaken: number;
    teamMembers: number;
    averageDaysPerMember: string;
  }>;
  topLeaveTakers: Array<{
    employeeName: string;
    employeeId: string;
    teamName: string;
    totalRequests: number;
    totalDaysTaken: number;
  }>;
  semiAnnualUsage: Array<{
    employeeName: string;
    teamName: string;
    semiAnnualPeriod: number;
    vacationDaysUsed: number;
    weekendLeavesUsed: number;
    vacationRemaining: number;
    weekendRemaining: number;
  }>;
  ruleViolations: Array<{
    ruleType: string;
    violations: number;
  }>;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (action: 'approve' | 'reject', notes: string) => void;
  leaveRequest: LeaveRequest | null;
  isSubmitting: boolean;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  leaveRequest, 
  isSubmitting 
}) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(action, adminNotes);
  };

  if (!isOpen || !leaveRequest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Review Leave Request</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Request Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-3">Request Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Employee:</strong>
              <p>{leaveRequest.employee.firstName} {leaveRequest.employee.lastName}</p>
              <p className="text-gray-600">{leaveRequest.employee.email}</p>
              <p className="text-gray-600">ID: {leaveRequest.employee.employeeId}</p>
            </div>
            <div>
              <strong>Team:</strong>
              <p>{leaveRequest.employee.teamName}</p>
            </div>
            <div>
              <strong>Leave Type:</strong>
              <p className="capitalize">{leaveRequest.leaveType}</p>
            </div>
            <div>
              <strong>Category:</strong>
              <p className="capitalize">{leaveRequest.leaveCategory}</p>
            </div>
            <div>
              <strong>Dates:</strong>
              <p>{new Date(leaveRequest.startDate).toLocaleDateString()} - {new Date(leaveRequest.endDate).toLocaleDateString()}</p>
              {leaveRequest.halfDay && (
                <p className="text-gray-600">Half Day ({leaveRequest.halfDayPeriod})</p>
              )}
            </div>
            <div>
              <strong>Duration:</strong>
              <p>{leaveRequest.totalDays} days</p>
            </div>
            <div className="col-span-2">
              <strong>Reason:</strong>
              <p>{leaveRequest.reason}</p>
            </div>
            {leaveRequest.emergencyContactName && (
              <div className="col-span-2">
                <strong>Emergency Contact:</strong>
                <p>{leaveRequest.emergencyContactName} - {leaveRequest.emergencyContactPhone}</p>
              </div>
            )}
          </div>

          {/* Special Indicators */}
          <div className="mt-3 flex flex-wrap gap-2">
            {leaveRequest.isWeekendLeave && (
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                Weekend Leave
              </span>
            )}
            {!leaveRequest.teamConflictCheck && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                Team Capacity Issue
              </span>
            )}
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              Semi-Annual {leaveRequest.semiAnnualPeriod} ({leaveRequest.semiAnnualPeriod === 1 ? 'Jan-Jun' : 'Jul-Dec'})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="action"
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
                  name="action"
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
              Admin Notes {action === 'reject' && '(Required for rejection)'}
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={action === 'approve' ? 'Optional notes...' : 'Please provide reason for rejection...'}
              required={action === 'reject'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isSubmitting ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'} Request`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminEnhancedLeaveManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [statistics, setStatistics] = useState<LeaveStatistics>({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });
  const [analytics, setAnalytics] = useState<LeaveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    teamId: '',
    year: new Date().getFullYear().toString()
  });

  const [activeTab, setActiveTab] = useState<'requests' | 'analytics'>('requests');

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentPage, filters]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, filters.year]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      });

      const response = await fetch(`/api/admin-leave/admin/leave-requests?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const data = await response.json();
      setLeaveRequests(data.leaveRequests);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin-leave/admin/leave-analytics?year=${filters.year}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const handleReviewRequest = async (action: 'approve' | 'reject', adminNotes: string) => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin-leave/admin/leave-request/${selectedRequest.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, adminNotes })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to review leave request');
      }

      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      await fetchLeaveRequests();
      
      alert(`Leave request ${action}d successfully!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to review leave request');
    } finally {
      setIsSubmitting(false);
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

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  if (loading && activeTab === 'requests') {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Leave Management - Admin</h1>
          <p className="text-gray-600">Manage employee leave requests with business rules</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-800">{statistics.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-800">{statistics.approved}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-red-800">{statistics.rejected}</div>
            <div className="text-sm text-red-600">Rejected</div>
          </div>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{statistics.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Leave Requests
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Reports
          </button>
        </nav>
      </div>

      {activeTab === 'requests' && (
        <>
          {/* Filters */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Statuses</option>
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
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Types</option>
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
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2025">2025</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setFilters({ status: '', leaveType: '', teamId: '', year: new Date().getFullYear().toString() });
                      setCurrentPage(1);
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Leave Requests Table */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Leave Requests</h3>
              
              {leaveRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No leave requests found</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3">Employee</th>
                          <th className="text-left py-3">Type</th>
                          <th className="text-left py-3">Dates</th>
                          <th className="text-left py-3">Days</th>
                          <th className="text-left py-3">Status</th>
                          <th className="text-left py-3">Category</th>
                          <th className="text-left py-3">Team</th>
                          <th className="text-left py-3">Submitted</th>
                          <th className="text-left py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map((request) => (
                          <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3">
                              <div>
                                <div className="font-medium">
                                  {request.employee.firstName} {request.employee.lastName}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {request.employee.employeeId}
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="capitalize">{request.leaveType}</div>
                              {request.isWeekendLeave && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                                  Weekend
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <div>
                                {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                {request.halfDay && (
                                  <div className="text-xs text-gray-500">
                                    Half Day ({request.halfDayPeriod})
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3">{request.totalDays}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="py-3 capitalize">{request.leaveCategory}</td>
                            <td className="py-3">{request.employee.teamName}</td>
                            <td className="py-3">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              {request.status === 'pending' && (
                                <Button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsReviewModalOpen(true);
                                  }}
                                  size="sm"
                                >
                                  Review
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        variant="secondary"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        variant="secondary"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {activeTab === 'analytics' && analytics && (
        <>
          {/* Monthly Trends */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Leave Trends ({filters.year})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {analytics.monthlyTrends.map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="text-lg font-bold text-blue-600">{month.totalRequests}</div>
                    <div className="text-sm text-gray-600">{getMonthName(month.month)}</div>
                    <div className="text-xs text-gray-500">{month.totalDaysTaken} days</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Leave Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Leave Type Breakdown</h3>
                <div className="space-y-3">
                  {analytics.leaveTypeBreakdown.map((type) => (
                    <div key={type.leaveType} className="flex justify-between items-center">
                      <span className="capitalize font-medium">{type.leaveType}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">{type.totalRequests} requests</div>
                        <div className="text-xs text-gray-500">{type.totalDaysTaken} days</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Business Rule Violations</h3>
                <div className="space-y-3">
                  {analytics.ruleViolations.map((violation) => (
                    <div key={violation.ruleType} className="flex justify-between items-center">
                      <span className="font-medium">{violation.ruleType}</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        violation.violations > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {violation.violations} issues
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Top Leave Takers */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Top Leave Takers ({filters.year})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Employee</th>
                      <th className="text-left py-2">Team</th>
                      <th className="text-left py-2">Total Requests</th>
                      <th className="text-left py-2">Total Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topLeaveTakers.slice(0, 10).map((employee, index) => (
                      <tr key={`${employee.employeeId}-${index}`} className="border-b border-gray-100">
                        <td className="py-2">
                          <div>
                            <div className="font-medium">{employee.employeeName}</div>
                            <div className="text-gray-500 text-xs">{employee.employeeId}</div>
                          </div>
                        </td>
                        <td className="py-2">{employee.teamName}</td>
                        <td className="py-2">{employee.totalRequests}</td>
                        <td className="py-2">{employee.totalDaysTaken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Semi-Annual Usage */}
          <Card>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Semi-Annual Leave Usage ({filters.year})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Employee</th>
                      <th className="text-left py-2">Team</th>
                      <th className="text-left py-2">Period</th>
                      <th className="text-left py-2">Vacation Used</th>
                      <th className="text-left py-2">Weekend Leaves</th>
                      <th className="text-left py-2">Vacation Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.semiAnnualUsage.map((usage, index) => (
                      <tr key={`${usage.employeeName}-${usage.semiAnnualPeriod}-${index}`} className="border-b border-gray-100">
                        <td className="py-2">{usage.employeeName}</td>
                        <td className="py-2">{usage.teamName}</td>
                        <td className="py-2">{usage.semiAnnualPeriod === 1 ? 'Jan-Jun' : 'Jul-Dec'}</td>
                        <td className="py-2">{usage.vacationDaysUsed} / 12</td>
                        <td className="py-2">{usage.weekendLeavesUsed} / 2</td>
                        <td className="py-2">
                          <span className={usage.vacationRemaining <= 2 ? 'text-red-600' : 'text-green-600'}>
                            {usage.vacationRemaining} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleReviewRequest}
        leaveRequest={selectedRequest}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AdminEnhancedLeaveManagement;
