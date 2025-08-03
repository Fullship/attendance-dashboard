import React, { useState, useEffect } from 'react';
import { MagicCard, ShimmerButton, NumberTicker, GradientText, FadeInStagger } from './ui';
import { adminAPI } from '../utils/api';
import { Employee, Location, Team } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface OrganizationalNode {
  id: number;
  name: string;
  email: string;
  role: string;
  location?: Location;
  team?: Team;
  directReports: OrganizationalNode[];
  isManager: boolean;
  managerId?: number;
  avatar?: string;
}

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: OrganizationalNode | null;
}

const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  employee 
}) => {
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [manager, setManager] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    averageHours: 0
  });

  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeDetails();
    }
  }, [isOpen, employee]);

  const fetchEmployeeDetails = async () => {
    if (!employee) return;
    
    try {
      setLoading(true);
      
      // Fetch detailed employee information
      const detailsResponse = await adminAPI.getEmployeeById(employee.id);
      setEmployeeDetails(detailsResponse.employee);
      
      // Fetch manager details if exists
      if (employee.managerId) {
        try {
          const managerResponse = await adminAPI.getEmployeeById(employee.managerId);
          setManager(managerResponse.employee);
        } catch (err) {
          console.warn('Could not fetch manager details:', err);
          setManager(null);
        }
      }
      
      // Fetch attendance statistics (mock data for now)
      // In a real implementation, you would call an API endpoint
      setAttendanceStats({
        totalDays: 30,
        presentDays: 28,
        lateDays: 3,
        averageHours: 8.2
      });
      
    } catch (err) {
      console.error('Failed to fetch employee details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  const attendanceRate = Math.round((attendanceStats.presentDays / attendanceStats.totalDays) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <MagicCard gradientColor="#8b5cf6" className="m-0">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <GradientText 
                className="text-2xl font-bold"
                colors={['#8b5cf6', '#3b82f6']}
              >
                Employee Details
              </GradientText>
              
              <ShimmerButton
                onClick={onClose}
                background="linear-gradient(45deg, #ef4444, #dc2626)"
                className="px-4 py-2"
              >
                ✕ Close
              </ShimmerButton>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <FadeInStagger className="space-y-6" staggerDelay={0.1}>
                {/* Employee Profile */}
                <MagicCard gradientColor="#3b82f6">
                  <div className="p-6">
                    <div className="flex items-start space-x-6">
                      {/* Avatar */}
                      <div className={`${employee.avatar} w-20 h-20 text-xl`}>
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      
                      {/* Basic Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {employee.name}
                          </h2>
                          {employee.isManager && (
                            <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                              Manager
                            </span>
                          )}
                        </div>
                        
                        <p className="text-lg text-purple-600 dark:text-purple-400 font-medium mb-2">
                          {employee.role}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {employee.email}
                          </div>
                          
                          {employee.location && (
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {employee.location.name}
                              {employee.location.timezone && (
                                <span className="ml-1 text-sm">({employee.location.timezone})</span>
                              )}
                            </div>
                          )}
                          
                          {employee.team && (
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {employee.team.name}
                            </div>
                          )}
                          
                          {(employeeDetails as any)?.phoneNumber && (
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {(employeeDetails as any).phoneNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </MagicCard>

                {/* Manager Information */}
                {manager && (
                  <MagicCard gradientColor="#10b981">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Reports To
                      </h3>
                      
                      <div className="flex items-center space-x-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="w-12 h-12 bg-green-500 text-white font-semibold flex items-center justify-center rounded-full">
                          {manager.firstName[0]}{manager.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {manager.firstName} {manager.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {manager.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                )}

                {/* Direct Reports */}
                {employee.directReports.length > 0 && (
                  <MagicCard gradientColor="#f59e0b">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Direct Reports ({employee.directReports.length})
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employee.directReports.map(report => (
                          <div 
                            key={report.id} 
                            className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                          >
                            <div className={`${report.avatar} w-10 h-10 text-sm`}>
                              {report.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {report.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {report.role}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </MagicCard>
                )}

                {/* Attendance Statistics */}
                <MagicCard gradientColor="#6366f1">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Attendance Overview (Last 30 Days)
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          <NumberTicker value={attendanceRate} />%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          <NumberTicker value={attendanceStats.presentDays} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Present Days</div>
                      </div>
                      
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          <NumberTicker value={attendanceStats.lateDays} />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Late Days</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          <NumberTicker value={attendanceStats.averageHours} />h
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Hours</div>
                      </div>
                    </div>
                  </div>
                </MagicCard>

                {/* Additional Details */}
                {employeeDetails && (
                  <MagicCard gradientColor="#ec4899">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Additional Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                            <span className="font-medium text-gray-900 dark:text-white">#{employeeDetails.id}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              (employeeDetails as any).isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {(employeeDetails as any).isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          {(employeeDetails as any).joinDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Join Date:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {new Date((employeeDetails as any).joinDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Admin Access:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              employeeDetails.isAdmin
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                            }`}>
                              {employeeDetails.isAdmin ? 'Yes' : 'No'}
                            </span>
                          </div>
                          
                          {(employeeDetails as any).lastLogin && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Last Login:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {new Date((employeeDetails as any).lastLogin).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                )}
              </FadeInStagger>
            )}
          </div>
        </MagicCard>
      </div>
    </div>
  );
};

export default EmployeeDetailsModal;
