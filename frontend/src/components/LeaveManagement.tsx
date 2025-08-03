import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';

interface LeaveRequest {
  id: number;
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

interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
}

const LeaveRequestModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    halfDay: false,
    halfDayPeriod: 'morning',
    reason: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    supportingDocument: null as File | null,
  });

  const leaveTypes = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'emergency', label: 'Emergency Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'bereavement', label: 'Bereavement Leave' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'supportingDocument' && value instanceof File) {
        submitData.append('supportingDocument', value);
      } else if (value !== null && value !== '' && typeof value !== 'object') {
        submitData.append(key, value.toString());
      }
    });

    onSubmit(submitData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, supportingDocument: file }));
  };

  const calculateTotalDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (formData.halfDay && start.getTime() === end.getTime()) {
      return 0.5;
    }

    // Calculate business days
    let businessDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        businessDays++;
      }
    }
    return businessDays;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Request Leave</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
              <select
                value={formData.leaveType}
                onChange={e => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {leaveTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Half Day</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.halfDay}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        halfDay: e.target.checked,
                        endDate: e.target.checked ? prev.startDate : prev.endDate,
                      }))
                    }
                    className="mr-2"
                  />
                  Half Day
                </label>
                {formData.halfDay && (
                  <select
                    value={formData.halfDayPeriod}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, halfDayPeriod: e.target.value }))
                    }
                    className="border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    startDate: e.target.value,
                    endDate: prev.halfDay ? e.target.value : prev.endDate,
                  }))
                }
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
                disabled={formData.halfDay}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Days: {calculateTotalDays()}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              value={formData.reason}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a detailed reason for your leave request..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={e =>
                  setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of emergency contact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={e =>
                  setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supporting Document
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Upload medical certificate, documents, etc. (PDF, DOC, DOCX, JPG, PNG - Max
              5MB)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LeaveManagement: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
  }, [selectedYear, filter]);

  const fetchLeaveRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (selectedYear) params.append('year', selectedYear.toString());

      const response = await fetch(`/api/leave/my-leave-requests?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLeaveRequests(data.leaveRequests);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const response = await fetch(`/api/leave/leave-balance?year=${selectedYear}`);
      const data = await response.json();

      if (response.ok) {
        setLeaveBalance(data.leaveBalance);
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (formData: FormData) => {
    try {
      const response = await fetch('/api/leave/leave-request', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setShowRequestModal(false);
        fetchLeaveRequests();
        fetchLeaveBalance();
        alert('Leave request submitted successfully!');
      } else {
        alert(data.message || 'Error submitting leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert('Error submitting leave request');
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      const response = await fetch(`/api/leave/leave-request/${requestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLeaveRequests();
        fetchLeaveBalance();
        alert('Leave request cancelled successfully');
      } else {
        const data = await response.json();
        alert(data.message || 'Error cancelling leave request');
      }
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      alert('Error cancelling leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
        <Button onClick={() => setShowRequestModal(true)}>Request Leave</Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveBalance.map(balance => (
          <Card key={balance.leaveType} className="p-4">
            <h3 className="font-medium text-gray-900 mb-2">{formatLeaveType(balance.leaveType)}</h3>
            <div className="text-2xl font-bold text-blue-600 mb-1">{balance.remaining}</div>
            <div className="text-sm text-gray-500">of {balance.allocated} days remaining</div>
            <div className="text-xs text-gray-400 mt-1">Used: {balance.used} days</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leave Requests List */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">My Leave Requests</h2>

          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No leave requests found</p>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map(request => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {formatLeaveType(request.leaveType)}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <strong>Dates:</strong> {request.startDate} to {request.endDate}
                          {request.halfDay && ` (${request.halfDayPeriod} half-day)`}
                        </div>
                        <div>
                          <strong>Duration:</strong> {request.totalDays} day
                          {request.totalDays !== 1 ? 's' : ''}
                        </div>
                        <div>
                          <strong>Requested:</strong>{' '}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>

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
                          {request.reviewedAt &&
                            ` on ${new Date(request.reviewedAt).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {request.status === 'pending' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Request Modal */}
      <LeaveRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
};

export default LeaveManagement;
