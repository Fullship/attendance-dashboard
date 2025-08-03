import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  DocumentTextIcon,
  FunnelIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { userAPI, handleApiError } from '../utils/api';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import LeaveRequestDetailsModal from './LeaveRequestDetailsModal';
import toast from 'react-hot-toast';

interface MyLeaveRequestsProps {
  refreshTrigger?: number;
  onLeaveRequestChanged?: () => void;
}

const MyLeaveRequests: React.FC<MyLeaveRequestsProps> = ({ refreshTrigger, onLeaveRequestChanged }) => {
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    leaveType: '',
    year: new Date().getFullYear(),
    page: 1,
    limit: 10
  });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('🔄 MyLeaveRequests component mounted with refreshTrigger:', refreshTrigger);
    return () => {
      console.log('🔄 MyLeaveRequests component unmounted');
    };
  }, [refreshTrigger]);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };

  const leaveTypeColors = {
    vacation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    sick: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    emergency: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    maternity: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
    paternity: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    bereavement: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };

  const fetchLeaveRequests = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const requestParams = forceRefresh ? { ...filters, force: true } : filters;
      console.log('Fetching leave requests with params:', requestParams);
      const response = await userAPI.getMyLeaveRequests(requestParams);
      console.log('Fetched leave requests:', response.leaveRequests.length, 'requests');
      setLeaveRequests(response.leaveRequests);
      setStats(response.stats);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Force refresh when refreshTrigger changes (e.g., after submitting a new request or switching tabs)
    console.log('RefreshTrigger changed:', refreshTrigger);
    
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('Forcing cache bypass due to refresh trigger...');
      fetchLeaveRequests(true);
    }
  }, [refreshTrigger, fetchLeaveRequests]);

  // Separate effect to fetch data when filters change
  useEffect(() => {
    console.log('Filters changed, fetching data...');
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !isRefreshing) {
        fetchLeaveRequests();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchLeaveRequests, loading, isRefreshing]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      // Force bypass cache when manually refreshing
      const response = await userAPI.getMyLeaveRequests({ ...filters, force: true });
      setLeaveRequests(response.leaveRequests);
      setStats(response.stats);
      setPagination(response.pagination);
      toast.success('Leave requests refreshed');
    } catch (error) {
      toast.error('Failed to refresh leave requests');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelRequest = async (request: any) => {
    try {
      // Show confirmation dialog
      if (!window.confirm(`Are you sure you want to cancel this ${request.leaveType} leave request?`)) {
        return;
      }

      // Set loading state for this specific request
      setCancellingRequestId(request.id);

      await userAPI.cancelLeaveRequest(request.id);
      toast.success('Leave request cancelled successfully');
      
      // Force refresh the list to bypass cache
      console.log('Leave request cancelled, forcing refresh...');
      fetchLeaveRequests(true);
      
      // Notify parent component about the change
      if (onLeaveRequestChanged) {
        onLeaveRequestChanged();
      }
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      // Clear loading state
      setCancellingRequestId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (startDate: string, endDate: string, halfDay: boolean, totalDays: number) => {
    if (halfDay) {
      return '0.5 day';
    }
    return `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalRequests || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.pendingRequests || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.approvedRequests || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalDaysUsed || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Days Used</div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.leaveType}
              onChange={(e) => handleFilterChange('leaveType', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </Card>

      {/* Leave Requests List */}
      <Card 
        title="My Leave Requests"
        subtitle={`${pagination?.total || 0} requests found`}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="min-w-[100px]"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      >
        {leaveRequests.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No leave requests found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Submit your first leave request to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                         hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leaveTypeColors[request.leaveType as keyof typeof leaveTypeColors] || leaveTypeColors.other
                      }`}>
                        {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[request.status as keyof typeof statusColors] || statusColors.pending
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      {request.halfDay && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                          Half Day ({request.halfDayPeriod})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatDate(request.startDate)}
                          {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {calculateDuration(
                            request.startDate, 
                            request.endDate, 
                            request.halfDay, 
                            request.totalDays
                          )}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          Submitted: {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      </div>
                    )}

                    {request.adminNotes && (
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Admin Notes:</span> {request.adminNotes}
                        </p>
                      </div>
                    )}

                    {request.reviewedAt && request.reviewedByName && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.reviewedByName} on {formatDate(request.reviewedAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(request)}
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                    
                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRequest(request)}
                        disabled={cancellingRequestId === request.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {cancellingRequestId === request.id ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <XMarkIcon className="w-4 h-4 mr-2" />
                        )}
                        {cancellingRequestId === request.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.pages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Leave Request Details Modal */}
      <LeaveRequestDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
        request={selectedRequest}
      />
    </div>
  );
};

export default MyLeaveRequests;
