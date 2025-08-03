import React from 'react';
import { 
  CalendarDaysIcon, 
  DocumentTextIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/react/24/outline';

interface LeaveRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

const LeaveRequestDetailsModal: React.FC<LeaveRequestDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  request 
}) => {
  if (!isOpen || !request) return null;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-gray-600" />;
      default:
        return <PendingIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Leave Request Details
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Request ID: {request.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          
          {/* Status and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(request.status)}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[request.status as keyof typeof statusColors]}`}>
                  {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Leave Type</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${leaveTypeColors[request.leaveType as keyof typeof leaveTypeColors]}`}>
                  {request.leaveType?.charAt(0).toUpperCase() + request.leaveType?.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <CalendarDaysIcon className="w-5 h-5 mr-2" />
              Leave Period
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(request.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(request.endDate)}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Days</p>
                <p className="font-medium text-gray-900 dark:text-white">{request.totalDays} day{request.totalDays !== 1 ? 's' : ''}</p>
              </div>
              {request.halfDay && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Half Day Period</p>
                  <p className="font-medium text-gray-900 dark:text-white">{request.halfDayPeriod?.charAt(0).toUpperCase() + request.halfDayPeriod?.slice(1)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Reason
              </h4>
              <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {request.reason}
              </p>
            </div>
          )}

          {/* Emergency Contact */}
          {(request.emergencyContactName || request.emergencyContactPhone) && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Emergency Contact
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {request.emergencyContactName && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Name:</span> {request.emergencyContactName}
                  </p>
                )}
                {request.emergencyContactPhone && (
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Phone:</span> {request.emergencyContactPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {request.adminNotes && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Admin Notes
              </h4>
              <p className="text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-400">
                {request.adminNotes}
              </p>
            </div>
          )}

          {/* Reviewer Info */}
          {request.reviewer && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Reviewed By
              </h4>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-700 dark:text-gray-300">
                  {request.reviewer.firstName} {request.reviewer.lastName}
                </p>
                {request.reviewedAt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDateTime(request.reviewedAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Created</p>
              <p className="text-gray-900 dark:text-white">{formatDateTime(request.createdAt)}</p>
            </div>
            {request.updatedAt !== request.createdAt && (
              <div>
                <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-gray-900 dark:text-white">{formatDateTime(request.updatedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestDetailsModal;
