import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ClockIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userAPI, handleApiError } from '../utils/api';
import Button from './Button';

interface ClockRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
  initialRequestType?: 'clock_in' | 'clock_out';
}

const ClockRequestModal: React.FC<ClockRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestSubmitted,
  initialRequestType = 'clock_in'
}) => {
  const [formData, setFormData] = useState({
    requestType: initialRequestType,
    requestedTime: '',
    reason: ''
  });

  // Update form data when modal opens with new request type
  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        requestType: initialRequestType,
        requestedTime: '',
        reason: ''
      }));
    }
  }, [isOpen, initialRequestType]);
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await userAPI.submitClockRequest(formData);
      toast.success('Clock request submitted successfully and is pending admin approval');
      onRequestSubmitted();
      onClose();
      // Reset form
      setFormData({
        requestType: 'clock_in',
        requestedTime: '',
        reason: ''
      });
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeInfo = () => {
    if (formData.requestType === 'clock_in') {
      return {
        title: 'Clock In Request',
        icon: <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-400" />,
        description: 'Request to clock in at a specific time',
        color: 'green'
      };
    } else {
      return {
        title: 'Clock Out Request',
        icon: <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
        description: 'Request to clock out at a specific time',
        color: 'blue'
      };
    }
  };

  const typeInfo = getRequestTypeInfo();

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {typeInfo.icon}
                    </div>
                    <div className="text-left">
                      <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 dark:text-white">
                        {typeInfo.title}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {typeInfo.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 pb-6">
                  <div className="space-y-5">
                    {/* Request Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Request Type
                      </label>
                      <div className="relative">
                        <select
                          value={formData.requestType}
                          onChange={(e) => setFormData({...formData, requestType: e.target.value as 'clock_in' | 'clock_out'})}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                          required
                        >
                          <option value="clock_in">🟢 Clock In</option>
                          <option value="clock_out">🔵 Clock Out</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Requested Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Requested Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.requestedTime}
                        onChange={(e) => setFormData({...formData, requestedTime: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                        required
                      />
                    </div>
                    
                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Request
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors resize-none"
                        rows={4}
                        placeholder="Please explain why you need this clock request..."
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Your request will be reviewed by an administrator
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={loading}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Submit Request
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClockRequestModal;