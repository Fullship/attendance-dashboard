import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import FilePreview from './FilePreview';

interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
  resetPeriod?: string;
  requiresApproval?: boolean;
  approver?: string;
  maxConsecutive?: number;
  description?: string;
}

interface WeekendLeaveUsage {
  used: number;
  remaining: number;
  maxAllowed: number;
}

interface BusinessRules {
  workingDays: string;
  weekends: string;
  workingHours: string;
  lunchBreak: string;
  maxConsecutiveLeave: number;
  teamLeaveLimit: string;
  weekendLeaveLimit: string;
}

interface LeaveRequest {
  id: number;
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

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
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

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const leaveTypes = [
    { value: 'vacation', label: 'Vacation (24 days/year, 12 per semi-annual)' },
    { value: 'sick', label: 'Sick Leave (10 days/year, requires admin approval)' },
    { value: 'personal', label: 'Personal Leave (3 days/year)' },
    { value: 'emergency', label: 'Emergency Leave (2 days/year)' },
    { value: 'maternity', label: 'Maternity Leave (90 days: 60 basic pay + 30 WFH)' },
    { value: 'paternity', label: 'Paternity Leave (14 days/year)' },
    { value: 'bereavement', label: 'Bereavement Leave (5 days/year)' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: { [key: string]: string } = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (formData.halfDay && !formData.halfDayPeriod) {
      newErrors.halfDayPeriod = 'Half day period is required';
    }

    // Check if dates are working days (Sunday-Thursday)
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay(); // 0=Sunday, 6=Saturday
        if (day === 5 || day === 6) {
          // Friday or Saturday
          newErrors.dateRange =
            'Leave dates cannot include weekends (Friday/Saturday). Working days are Sunday to Thursday.';
          break;
        }
      }

      // Check for maximum 5 consecutive days
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (!formData.halfDay && totalDays > 5) {
        newErrors.dateRange = 'Maximum consecutive leave period is 5 working days';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'supportingDocument' && formData[key]) {
        submitData.append(key, formData[key] as File);
      } else if (key !== 'supportingDocument') {
        submitData.append(key, String(formData[key as keyof typeof formData]));
      }
    });

    onSubmit(submitData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setFormData(prev => ({ ...prev, [name]: file }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear related errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Submit Leave Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {errors.dateRange && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">{errors.dateRange}</div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              name="halfDay"
              id="halfDay"
              checked={formData.halfDay}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label htmlFor="halfDay" className="text-sm text-gray-700">
              Half Day Leave (only for single day)
            </label>
          </div>

          {formData.halfDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Half Day Period *
              </label>
              <select
                name="halfDayPeriod"
                value={formData.halfDayPeriod}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="morning">Morning (9:00 AM - 1:00 PM)</option>
                <option value="afternoon">Afternoon (2:00 PM - 5:00 PM)</option>
              </select>
              {errors.halfDayPeriod && (
                <p className="text-red-500 text-xs mt-1">{errors.halfDayPeriod}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Leave *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please provide a detailed reason for your leave request..."
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supporting Document (Optional)
            </label>
            <input
              type="file"
              name="supportingDocument"
              onChange={handleInputChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
            </p>

            {/* File Preview */}
            {formData.supportingDocument && (
              <div className="mt-3">
                <FilePreview
                  file={formData.supportingDocument}
                  maxWidth={150}
                  maxHeight={150}
                  onRemove={() => setFormData(prev => ({ ...prev, supportingDocument: null }))}
                  showFileName={true}
                />
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Business Rules Reminder:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Working days: Sunday to Thursday (9:00 AM - 5:00 PM)</li>
              <li>• Maximum 5 consecutive working days per leave request</li>
              <li>• Weekend leaves (Thursday/Sunday): Maximum 2 per semi-annual</li>
              <li>• Vacation: 12 days per semi-annual (Jan-Jun, Jul-Dec)</li>
              <li>• Sick leave requires admin approval</li>
              <li>• Team leave capacity: Maximum 49% of team members</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EnhancedLeaveManagement: React.FC = () => {
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [weekendLeaveUsage, setWeekendLeaveUsage] = useState<WeekendLeaveUsage>({
    used: 0,
    remaining: 2,
    maxAllowed: 2,
  });
  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    workingDays: '',
    weekends: '',
    workingHours: '',
    lunchBreak: '',
    maxConsecutiveLeave: 5,
    teamLeaveLimit: '',
    weekendLeaveLimit: '',
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentSemiAnnual, setCurrentSemiAnnual] = useState(1);

  useEffect(() => {
    fetchLeaveData();
    fetchLeaveRequests();
  }, [currentYear]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/enhanced-leave/leave-balance?year=${currentYear}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leave balance');
      }

      const data = await response.json();
      setLeaveBalance(data.leaveBalance);
      setWeekendLeaveUsage(data.weekendLeaveUsage);
      setBusinessRules(data.businessRules);
      setCurrentSemiAnnual(data.currentSemiAnnual);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch(`/api/enhanced-leave/my-leave-requests?year=${currentYear}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const data = await response.json();
      setLeaveRequests(data.leaveRequests);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  };

  const handleSubmitLeaveRequest = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/enhanced-leave/leave-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit leave request');
      }

      setIsModalOpen(false);
      await fetchLeaveData();
      await fetchLeaveRequests();

      // Show success message
      alert('Leave request submitted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
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

  const getSemiAnnualPeriodText = (period: number) => {
    return period === 1 ? 'Jan-Jun' : 'Jul-Dec';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Leave Management</h1>
          <p className="text-gray-600">
            Current Period: {getSemiAnnualPeriodText(currentSemiAnnual)} {currentYear}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Request Leave</Button>
      </div>

      {/* Business Rules Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Company Leave Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <strong>Working Schedule:</strong>
              <p>{businessRules.workingDays}</p>
              <p>{businessRules.workingHours}</p>
              <p>{businessRules.lunchBreak}</p>
            </div>
            <div>
              <strong>Leave Limits:</strong>
              <p>Max consecutive: {businessRules.maxConsecutiveLeave} days</p>
              <p>Team capacity: {businessRules.teamLeaveLimit}</p>
              <p>Weekend leaves: {businessRules.weekendLeaveLimit}</p>
            </div>
            <div>
              <strong>Vacation Policy:</strong>
              <p>24 days annually</p>
              <p>12 days per semi-annual</p>
              <p>Resets every 6 months</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Weekend Leave Usage */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Weekend Leave Usage ({getSemiAnnualPeriodText(currentSemiAnnual)} {currentYear})
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full"
                style={{
                  width: `${(weekendLeaveUsage.used / weekendLeaveUsage.maxAllowed) * 100}%`,
                }}
              ></div>
            </div>
            <span className="text-sm text-gray-600">
              {weekendLeaveUsage.used} / {weekendLeaveUsage.maxAllowed} used
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Weekend leaves (Thursday/Sunday) - Remaining: {weekendLeaveUsage.remaining}
          </p>
        </div>
      </Card>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {leaveBalance.map(balance => (
          <Card key={balance.leaveType} className="relative">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 capitalize">
                  {balance.leaveType.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                {balance.resetPeriod === 'semi-annual' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Semi-Annual
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium">{balance.allocated} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-medium">{balance.used} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span
                    className={`font-medium ${
                      balance.remaining <= 2 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {balance.remaining} days
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      balance.used / balance.allocated > 0.8
                        ? 'bg-red-500'
                        : balance.used / balance.allocated > 0.6
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((balance.used / balance.allocated) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Additional info */}
              {balance.requiresApproval && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Requires {balance.approver} approval
                </p>
              )}

              {balance.description && (
                <p className="text-xs text-gray-500 mt-2">{balance.description}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Leave Requests */}
      <Card>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Leave Requests</h3>

          {leaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No leave requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Dates</th>
                    <th className="text-left py-2">Days</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Period</th>
                    <th className="text-left py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(request => (
                    <tr key={request.id} className="border-b border-gray-100">
                      <td className="py-3 capitalize">
                        {request.leaveType}
                        {request.isWeekendLeave && (
                          <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">
                            Weekend
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div>
                          {new Date(request.startDate).toLocaleDateString()} -{' '}
                          {new Date(request.endDate).toLocaleDateString()}
                          {request.halfDay && (
                            <span className="block text-xs text-gray-500">
                              Half Day ({request.halfDayPeriod})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">{request.totalDays}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 capitalize">{request.leaveCategory}</td>
                      <td className="py-3">{getSemiAnnualPeriodText(request.semiAnnualPeriod)}</td>
                      <td className="py-3">{new Date(request.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitLeaveRequest}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default EnhancedLeaveManagement;
