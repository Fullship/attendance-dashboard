import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  DocumentIcon,
  InformationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { userAPI, handleApiError } from '../utils/api';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestSubmitted
}) => {
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [formData, setFormData] = useState({
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    halfDay: false,
    halfDayPeriod: 'morning',
    reason: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    supportingDocument: null as File | null
  });

  const leaveTypes = [
    { value: 'vacation', label: 'Vacation Leave', requiresDocument: false },
    { value: 'sick', label: 'Sick Leave', requiresDocument: true },
    { value: 'personal', label: 'Personal Leave', requiresDocument: false },
    { value: 'emergency', label: 'Emergency Leave', requiresDocument: false },
    { value: 'maternity', label: 'Maternity Leave', requiresDocument: true },
    { value: 'paternity', label: 'Paternity Leave', requiresDocument: true },
    { value: 'bereavement', label: 'Bereavement Leave', requiresDocument: true },
    { value: 'other', label: 'Other', requiresDocument: false }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchLeaveBalance();
    }
  }, [isOpen]);

  const fetchLeaveBalance = async () => {
    try {
      const balance = await userAPI.getLeaveBalance();
      setLeaveBalance(balance);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Same-day auto-enable half-day
    if (field === 'startDate') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate.getTime() === today.getTime()) {
        // Auto-enable half-day for same-day requests
        setFormData(prev => ({
          ...prev,
          halfDay: true,
          endDate: value
        }));
      }
    }

    // Auto-fill end date if it's a half day
    if (field === 'halfDay' && value) {
      setFormData(prev => ({
        ...prev,
        endDate: prev.startDate
      }));
    }

    // Clear end date if half day is unchecked and start date is same as end date
    if (field === 'halfDay' && !value && formData.startDate === formData.endDate) {
      setFormData(prev => ({
        ...prev,
        endDate: ''
      }));
    }
  };

  const handleFileUpload = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      supportingDocument: file
    }));
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (formData.halfDay) return 0.5;
    
    let days = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Count only working days (Sunday = 0 to Thursday = 4)
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    // Same-day validation: Only half-day requests allowed for current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate.getTime() === today.getTime() && !formData.halfDay) {
      toast.error('Full-day leave cannot be requested for the same day. Only half-day leave is allowed for today.');
      return;
    }

    setLoading(true);
    
    try {
      const requestData: any = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        halfDay: formData.halfDay,
        reason: formData.reason,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        supportingDocument: formData.supportingDocument || undefined
      };
      
      // Only include halfDayPeriod if halfDay is true
      if (formData.halfDay) {
        requestData.halfDayPeriod = formData.halfDayPeriod as 'morning' | 'afternoon';
      }
      
      await userAPI.submitLeaveRequest(requestData);
      
      toast.success('Leave request submitted successfully');
      onRequestSubmitted();
      onClose();
      
      // Reset form
      setFormData({
        leaveType: 'vacation',
        startDate: '',
        endDate: '',
        halfDay: false,
        halfDayPeriod: 'morning',
        reason: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        supportingDocument: null
      });
    } catch (error: any) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const selectedLeaveType = leaveTypes.find(type => type.value === formData.leaveType);
  const requestedDays = calculateDays();

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CalendarDaysIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                        Submit Leave Request
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Request time off with proper documentation
                      </p>
                    </div>
                  </div>
                </div>

                {/* Leave Balance Summary */}
                {leaveBalance && (
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-3">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Your Leave Balance
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">🏖️ Vacation</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {leaveBalance.balanceDetails?.vacation?.remaining || 0}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">🤒 Sick</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {leaveBalance.balanceDetails?.sick?.remaining || 0}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">👤 Personal</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {leaveBalance.balanceDetails?.personal?.remaining || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form id="leave-request-form" onSubmit={handleSubmit} className="px-6 py-6">
                  <div className="space-y-6">
                    {/* Leave Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Leave Type *
                      </label>
                      <div className="relative">
                        <select
                          value={formData.leaveType}
                          onChange={(e) => handleInputChange('leaveType', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors
                                   appearance-none cursor-pointer"
                          required
                        >
                          {leaveTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label} {type.requiresDocument && '📋'}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      {selectedLeaveType?.requiresDocument && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                          <DocumentIcon className="h-4 w-4 mr-1" />
                          Supporting documentation required for this leave type
                        </p>
                      )}
                    </div>

                    {/* Same-day Warning */}
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const startDate = new Date(formData.startDate);
                      startDate.setHours(0, 0, 0, 0);
                      
                      if (formData.startDate && startDate.getTime() === today.getTime()) {
                        return (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-start">
                              <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                              <div>
                                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                  Same-day Leave Request
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                  Full-day leave cannot be requested for today. Only half-day leave is allowed for same-day requests.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Date Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => handleInputChange('startDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                          min={formData.startDate || new Date().toISOString().split('T')[0]}
                          disabled={formData.halfDay}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors
                                   disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                          required
                        />
                      </div>
                    </div>

                    {/* Half Day Option */}
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <input
                        type="checkbox"
                        id="halfDay"
                        checked={formData.halfDay}
                        onChange={(e) => handleInputChange('halfDay', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor="halfDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Half Day Leave
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Select this for partial day off (4 hours)
                        </p>
                      </div>
                    </div>

                    {/* Half Day Period */}
                    {formData.halfDay && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Half Day Period *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('halfDayPeriod', 'first_half')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                              formData.halfDayPeriod === 'first_half'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            🌅 First Half
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Morning (9 AM - 1 PM)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('halfDayPeriod', 'second_half')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                              formData.halfDayPeriod === 'second_half'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            🌆 Second Half
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Afternoon (1 PM - 5 PM)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Days Calculation */}
                    {requestedDays > 0 && (
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Total Requested: <span className="font-semibold text-blue-600 dark:text-blue-400">{requestedDays} working day(s)</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason *
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                        placeholder="Please provide a detailed reason for your leave request..."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors
                                 resize-none"
                        required
                      />
                    </div>

                    {/* Document Upload */}
                    {selectedLeaveType?.requiresDocument && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Supporting Document *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            onChange={(e) => handleInputChange('document', e.target.files?.[0] || null)}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            className="w-full text-sm text-gray-500 dark:text-gray-400
                                     file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                                     file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 
                                     file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30
                                     file:transition-colors"
                          />
                          <div className="flex items-center mt-2">
                            <DocumentIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              PDF, DOC, DOCX, JPG, JPEG, PNG (Max 5MB)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Emergency Contact Name
                        </label>
                        <input
                          type="text"
                          value={formData.emergencyContactName}
                          onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                          placeholder="Contact person during leave"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Emergency Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.emergencyContactPhone}
                          onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                          placeholder="Phone number"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                                   focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Short Notice Warning */}
                    {formData.startDate && (() => {
                      const startDate = new Date(formData.startDate);
                      const today = new Date();
                      const daysUntilLeave = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (daysUntilLeave < 2) {
                        return (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <div className="flex items-start">
                              <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                              <div>
                                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                  Short Notice Leave Request
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                  This is a short-notice leave request. Your manager will be notified immediately for approval.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 
                               border border-gray-300 dark:border-gray-500 rounded-lg 
                               hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400
                               transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      form="leave-request-form"
                      loading={loading}
                      className="px-6 py-2"
                      onClick={handleSubmit}
                    >
                      {loading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LeaveRequestModal;
