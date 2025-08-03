import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { adminAPI, handleApiError } from '../utils/api';
import toast from 'react-hot-toast';

interface LeaveRequest {
  id: number;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
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
  adminNotes?: string;
  createdAt: string;
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

const LeaveRequestsManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [statistics, setStatistics] = useState<LeaveStatistics>({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentPage, filters]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      };

      const data = await adminAPI.getLeaveRequests(params);
      setLeaveRequests(data.leaveRequests);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = async (requestId: number, action: 'approve' | 'reject', adminNotes: string) => {
    try {
      await adminAPI.reviewLeaveRequest(requestId, { action, adminNotes });
      toast.success(`Leave request ${action}d successfully`);
      await fetchLeaveRequests();
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      setError(handleApiError(err));
      toast.error(`Failed to ${action} leave request`);
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

  if (loading) {
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Requests Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Review and manage employee leave requests</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-400">{statistics.pending}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-500">Pending</div>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200 dark:bg-green-900/20">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-800 dark:text-green-400">{statistics.approved}</div>
            <div className="text-sm text-green-600 dark:text-green-500">Approved</div>
          </div>
        </Card>
        <Card className="bg-red-50 border-red-200 dark:bg-red-900/20">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-red-800 dark:text-red-400">{statistics.rejected}</div>
            <div className="text-sm text-red-600 dark:text-red-500">Rejected</div>
          </div>
        </Card>
        <Card className="bg-gray-50 border-gray-200 dark:bg-gray-900/20">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-400">{statistics.cancelled}</div>
            <div className="text-sm text-gray-600 dark:text-gray-500">Cancelled</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
              <select
                value={filters.leaveType}
                onChange={(e) => setFilters(prev => ({ ...prev, leaveType: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leave Requests</h3>
          
          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No leave requests found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 text-gray-900 dark:text-white">Employee</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Type</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Dates</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Days</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Status</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Category</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Team</th>
                      <th className="text-left py-3 text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {request.employee.firstName} {request.employee.lastName}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {request.employee.employeeId}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="capitalize text-gray-900 dark:text-white">{request.leaveType}</div>
                          {request.isWeekendLeave && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded dark:bg-orange-900/30 dark:text-orange-400">
                              Weekend
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="text-gray-900 dark:text-white">
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            {request.halfDay && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Half Day ({request.halfDayPeriod})
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-gray-900 dark:text-white">{request.totalDays}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="py-3 capitalize text-gray-900 dark:text-white">{request.leaveCategory}</td>
                        <td className="py-3 text-gray-900 dark:text-white">{request.employee.teamName}</td>
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
                <div className="text-sm text-gray-500 dark:text-gray-400">
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

      {/* Review Modal */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review Leave Request
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Employee Details</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedRequest.employee.firstName} {selectedRequest.employee.lastName} ({selectedRequest.employee.employeeId})
                </p>
                <p className="text-gray-600 dark:text-gray-400">{selectedRequest.employee.email}</p>
                <p className="text-gray-600 dark:text-gray-400">Team: {selectedRequest.employee.teamName}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Leave Details</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Type: <span className="capitalize">{selectedRequest.leaveType}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Dates: {new Date(selectedRequest.startDate).toLocaleDateString()} - {new Date(selectedRequest.endDate).toLocaleDateString()}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Total Days: {selectedRequest.totalDays}
                </p>
                {selectedRequest.halfDay && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Half Day: {selectedRequest.halfDayPeriod}
                  </p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Reason</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes
              </label>
              <textarea
                id="adminNotes"
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Add notes about your decision..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setSelectedRequest(null);
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const adminNotes = (document.getElementById('adminNotes') as HTMLTextAreaElement)?.value || '';
                  handleReviewRequest(selectedRequest.id, 'reject', adminNotes);
                }}
                variant="secondary"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  const adminNotes = (document.getElementById('adminNotes') as HTMLTextAreaElement)?.value || '';
                  handleReviewRequest(selectedRequest.id, 'approve', adminNotes);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestsManagement;
