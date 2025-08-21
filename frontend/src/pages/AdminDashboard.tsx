import React, { useEffect, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, handleApiError } from '../utils/api';
import { formatDate, formatDateTime, formatTime } from '../utils/dateUtils';
import { AdminMetrics, Employee, FileUpload, AttendanceRecord } from '../types';
import { useSocket } from '../contexts/SocketContext';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import UploadProgressIndicator from '../components/UploadProgressIndicator';
import ErrorDetailsModal from '../components/ErrorDetailsModal';
import CreateEmployeeModal from '../components/CreateEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import AssignEmployeeModal from '../components/AssignEmployeeModal';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import AdminSettings from '../components/AdminSettings';
import { NumberTicker, MagicCard, FadeInStagger } from '../components/ui';
import { ReactPerformanceProfiler } from '../utils/ReactPerformanceProfiler';
import DashboardMonitoring from '../components/DashboardMonitoring';
import {
  LeaveRequestsManagementWithSuspense,
  ReactFlowOrganizationalChartWithSuspense,
  TeamManagerWithSuspense,
  LocationManagerWithSuspense,
  CareersPageWithSuspense,
} from '../components/LazyComponents';
import CareersManagement from '../components/admin/CareersManagement';
import { ComponentLoadingFallback } from '../components/LazyLoadingFallback';
import VirtualizedTable, {
  VirtualizedTableProps,
  TableColumn,
} from '../components/VirtualizedTableFixed';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'employees'
    | 'attendance'
    | 'clock-requests'
    | 'leave-requests'
    | 'org-chart'
    | 'settings'
    | 'monitoring'
    | 'careers'
  >('overview');

  // Attendance records state
  const [attendanceRecords, setAttendanceRecords] = useState<
    (AttendanceRecord & {
      employee: {
        firstName: string;
        lastName: string;
        email: string;
        team?: {
          name: string;
        };
      };
    })[]
  >([]);
  const [attendancePeriod, setAttendancePeriod] = useState('30');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('');
  const [attendanceDepartmentFilter, setAttendanceDepartmentFilter] = useState('');
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(25);
  const [attendancePagination, setAttendancePagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });
  const [attendanceDateRange, setAttendanceDateRange] = useState({ start: '', end: '' });
  const [selectedAttendanceRecords, setSelectedAttendanceRecords] = useState<number[]>([]);

  // Teams/Departments for filtering
  const [availableTeams, setAvailableTeams] = useState<{ id: number; name: string }[]>([]);

  // Global date range state (shared across all tabs)
  const [globalDateRange, setGlobalDateRange] = useState({ start: '', end: '' });
  const [globalPeriod, setGlobalPeriod] = useState('30');

  // Error details modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [selectedUploadErrors, setSelectedUploadErrors] = useState<string[]>([]);
  const [selectedUploadName, setSelectedUploadName] = useState('');

  // Create employee modal state
  const [createEmployeeModalOpen, setCreateEmployeeModalOpen] = useState(false);

  // Edit employee modal state
  const [editEmployeeModalOpen, setEditEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState<Employee | null>(null);

  // Employee details modal state (for org chart)
  const [employeeDetailsModalOpen, setEmployeeDetailsModalOpen] = useState(false);
  const [selectedEmployeeNode, setSelectedEmployeeNode] = useState<any>(null);

  // Sorting and filtering state
  const [employeeSort, setEmployeeSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'lastName',
    direction: 'asc',
  });
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [uploadSort, setUploadSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'upload_date',
    direction: 'desc',
  });
  const [uploadFilter, setUploadFilter] = useState('');

  // Clock requests state
  const [clockRequests, setClockRequests] = useState<any[]>([]);
  const [clockRequestsLoading, setClockRequestsLoading] = useState(false);
  const [clockRequestsFilter, setClockRequestsFilter] = useState<
    'pending' | 'approved' | 'rejected' | 'all'
  >('pending');
  const [clockRequestsPagination, setClockRequestsPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });

  // Pending counts for sidebar badges
  const [pendingClockRequests, setPendingClockRequests] = useState(0);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState(0);

  // Socket connection for real-time progress
  const { uploadProgress, isConnected } = useSocket();

  // Employee table columns for virtualization
  const employeeColumns: TableColumn[] = [
    {
      key: 'employee',
      header: 'Employee',
      width: '25%',
      minWidth: 200,
      render: (employee: Employee) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            <button
              onClick={() => handleViewEmployeeDetails(employee.id)}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer focus:outline-none focus:underline"
            >
              {employee.firstName} {employee.lastName}
            </button>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</div>
        </div>
      ),
    },
    {
      key: 'location_team',
      header: 'Location & Team',
      width: '20%',
      minWidth: 150,
      render: (employee: Employee) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
              📍 {employee.location?.name || 'No Location'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              👥 {employee.team?.name || 'No Team'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'presentDays',
      header: 'Present Days',
      width: '12%',
      minWidth: 100,
      align: 'center' as const,
      render: (employee: Employee) => (
        <span className="text-sm text-green-600 dark:text-green-400">
          {employee.stats.presentDays}
        </span>
      ),
    },
    {
      key: 'absentDays',
      header: 'Absent Days',
      width: '12%',
      minWidth: 100,
      align: 'center' as const,
      render: (employee: Employee) => (
        <span className="text-sm text-red-600 dark:text-red-400">{employee.stats.absentDays}</span>
      ),
    },
    {
      key: 'lateDays',
      header: 'Late Days',
      width: '12%',
      minWidth: 100,
      align: 'center' as const,
      render: (employee: Employee) => (
        <span className="text-sm text-yellow-600 dark:text-yellow-400">
          {employee.stats.lateDays}
        </span>
      ),
    },
    {
      key: 'averageHours',
      header: 'Avg Hours',
      width: '12%',
      minWidth: 100,
      align: 'center' as const,
      render: (employee: Employee) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {employee.stats.averageHours}h
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '15%',
      minWidth: 120,
      render: (employee: Employee) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditEmployee(employee)}
            className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={() => handleAssignEmployee(employee)}
            className="inline-flex items-center px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Assign
          </button>
          <button
            onClick={() =>
              handleDeleteEmployee(employee.id, `${employee.firstName} ${employee.lastName}`)
            }
            className="inline-flex items-center px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      ),
    },
  ];

  // Upload table columns for virtualization
  const uploadColumns: TableColumn[] = [
    {
      key: 'filename',
      header: 'File Name',
      width: '25%',
      minWidth: 200,
      render: (upload: FileUpload) => (
        <span className="text-sm text-gray-900 dark:text-white">{upload.original_name}</span>
      ),
    },
    {
      key: 'upload_date',
      header: 'Upload Date',
      width: '20%',
      minWidth: 150,
      render: (upload: FileUpload) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDateTime(upload.upload_date)}
        </span>
      ),
    },
    {
      key: 'records_processed',
      header: 'Records Processed',
      width: '15%',
      minWidth: 120,
      align: 'center' as const,
      render: (upload: FileUpload) => (
        <span className="text-sm text-gray-900 dark:text-white">{upload.records_processed}</span>
      ),
    },
    {
      key: 'errors_count',
      header: 'Errors',
      width: '10%',
      minWidth: 80,
      align: 'center' as const,
      render: (upload: FileUpload) => (
        <span className="text-sm text-red-600 dark:text-red-400">{upload.errors_count}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '20%',
      minWidth: 150,
      render: (upload: FileUpload) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            upload.status === 'completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : upload.status === 'completed_with_errors'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              : upload.status === 'processing'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}
        >
          {upload.status === 'processing' && (
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {upload.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      minWidth: 100,
      render: (upload: FileUpload) => (
        <div>
          {upload.errors_count > 0 && (
            <button
              onClick={() => handleViewErrors(upload.id, upload.original_name)}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              View Errors
            </button>
          )}
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchData();
    fetchTeams(); // Fetch teams for department filtering
  }, []);

  // Debug: Monitor availableTeams state changes
  useEffect(() => {
    console.log('🔄 availableTeams state changed:', availableTeams);
    console.log('🔄 availableTeams count:', availableTeams.length);
    console.log(
      '🔄 availableTeams details:',
      availableTeams.map((team, i) => `${i}: ${team.name} (id: ${team.id})`)
    );
  }, [availableTeams]);

  // Fetch data when global period changes
  useEffect(() => {
    if (globalPeriod !== '30') {
      // Don't refetch on initial load
      fetchData();
    }
  }, [globalPeriod]);

  // Sync attendance period with global period
  useEffect(() => {
    setAttendancePeriod(globalPeriod);
  }, [globalPeriod]);

  // Fetch attendance records when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceRecords();
    }
  }, [
    activeTab,
    attendancePeriod,
    attendanceSearch,
    attendancePage,
    attendanceLimit,
    attendanceStatusFilter,
    attendanceDepartmentFilter,
  ]);

  // Fetch clock requests when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'clock-requests') {
      fetchClockRequests();
    }
  }, [activeTab, clockRequestsFilter, clockRequestsPagination.page, clockRequestsPagination.limit]);

  // Clear upload progress and refresh data when upload completes
  useEffect(() => {
    if (uploadProgress?.phase === 'completed' || uploadProgress?.phase === 'failed') {
      // Refresh uploads list after a short delay
      setTimeout(() => {
        fetchData();
      }, 2000);
    }
  }, [uploadProgress?.phase]);

  // Fetch pending counts on component mount and periodically refresh
  useEffect(() => {
    fetchPendingCounts();

    // Refresh pending counts every 30 seconds
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsResponse, employeesResponse, uploadsResponse] = await Promise.all([
        adminAPI.getMetrics(globalPeriod),
        adminAPI.getEmployees({ limit: 10, period: globalPeriod }),
        adminAPI.getUploads({ limit: 10 }),
      ]);

      setMetrics(metricsResponse);
      setEmployees(employeesResponse.employees);
      setUploads(uploadsResponse.uploads);

      // Update global date range from metrics response
      if (metricsResponse.dateRange) {
        setGlobalDateRange(metricsResponse.dateRange);
      }
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAttendanceRecords({
        page: attendancePage,
        limit: attendanceLimit,
        period: attendancePeriod,
        search: attendanceSearch || undefined,
      });

      setAttendanceRecords(response.records);
      setAttendancePagination(response.pagination);
      setAttendanceDateRange(response.dateRange);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };
  const fetchTeams = async () => {
    console.group('🔍 fetchTeams Debug');

    // Check authentication status
    const token = localStorage.getItem('token');
    console.log('🔐 Authentication token present:', !!token);
    console.log('🔐 Token length:', token ? token.length : 0);
    console.log('🔐 Token preview:', token ? token.substring(0, 20) + '...' : 'None');

    // Check user context
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('👤 Current user:', user);
    console.log('👤 User role:', user?.role);

    // Check network connectivity
    console.log('🌐 Navigator online:', navigator.onLine);
    console.log('🌐 Window location:', window.location.href);

    try {
      console.log('🚀 Starting teams API call...');
      console.log('🌐 API endpoint: /api/admin/teams');
      console.time('Teams API Call');

      // Let's also manually test with fetch to see raw network response
      const getApiBaseUrl = () => {
        if (process.env.REACT_APP_API_URL) {
          return process.env.REACT_APP_API_URL.replace('/api', '');
        }
        // For development with proxy, use relative URLs
        if (process.env.NODE_ENV === 'development') {
          return ''; // Empty string for relative URLs with proxy
        }
        if (window.location.hostname === 'my.fullship.net') {
          return 'https://my.fullship.net';
        }
        return 'http://localhost:3002';
      };
      
      const baseURL = getApiBaseUrl();
      const fullURL = `${baseURL}/api/admin/teams`;
      console.log('🌐 Full URL being called:', fullURL);

      // Test with raw fetch first
      try {
        console.log('🧪 Testing with raw fetch...');
        const rawResponse = await fetch(fullURL, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('🧪 Raw fetch response status:', rawResponse.status);
        console.log(
          '🧪 Raw fetch response headers:',
          Object.fromEntries(rawResponse.headers.entries())
        );

        if (rawResponse.ok) {
          const rawData = await rawResponse.json();
          console.log('🧪 Raw fetch response data:', rawData);
        } else {
          const rawError = await rawResponse.text();
          console.log('🧪 Raw fetch error response:', rawError);
        }
      } catch (fetchError) {
        console.error('🧪 Raw fetch failed:', fetchError);
      }

      const response = await adminAPI.getTeams();

      console.timeEnd('Teams API Call');
      console.log('✅ Teams API response received:', response);
      console.log('📊 Response type:', typeof response);
      console.log('📊 Response keys:', response ? Object.keys(response) : 'No response');

      if (response && response.teams && Array.isArray(response.teams)) {
        console.log('✅ Valid teams array found:', response.teams);
        console.log('📈 Teams count:', response.teams.length);

        response.teams.forEach((team, index) => {
          console.log(`👥 Team ${index + 1}:`, {
            id: team.id,
            name: team.name,
            fullObject: team,
          });
        });

        const teams = response.teams.map(team => ({ id: team.id, name: team.name }));
        console.log('🔄 Mapped teams for state:', teams);

        setAvailableTeams(teams);
        console.log('✅ Successfully called setAvailableTeams with:', teams);
      } else {
        console.warn('❌ Invalid teams response structure:', response);
        console.log('🔍 Expected: { teams: [...] }');
        console.log('🔍 Received structure:', response);

        // Set real database teams as fallback instead of hardcoded ones
        const databaseTeams = [
          { id: 1, name: 'Development' },
          { id: 2, name: 'Finance' },
          { id: 3, name: 'Hiring' },
          { id: 4, name: 'Operations' },
        ];
        console.log('🔄 Setting database teams as fallback:', databaseTeams);
        setAvailableTeams(databaseTeams);
        console.log('✅ Successfully called setAvailableTeams with database teams:', databaseTeams);
      }
    } catch (error: any) {
      console.error('❌ Error fetching teams:', error);
      console.log('🔍 Error type:', error?.constructor?.name);
      console.log('🔍 Error message:', error?.message);
      console.log('🔍 Error status:', error?.status || error?.response?.status);
      console.log('🔍 Error response:', error?.response?.data || error?.response);
      console.log('🔍 Full error object:', error);

      // Check if it's an authentication error
      if (error?.response?.status === 401 || error?.status === 401) {
        console.warn('🚨 Authentication error - user may need to login again');
      }

      // Set real database teams as fallback instead of hardcoded ones
      const databaseTeams = [
        { id: 1, name: 'Development' },
        { id: 2, name: 'Finance' },
        { id: 3, name: 'Hiring' },
        { id: 4, name: 'Operations' },
      ];
      console.log('🔄 Setting database teams due to error:', databaseTeams);
      setAvailableTeams(databaseTeams);
      console.log(
        '✅ Successfully called setAvailableTeams with error fallback database teams:',
        databaseTeams
      );
    } finally {
      console.groupEnd();
    }
  };

  const fetchClockRequests = async () => {
    try {
      setClockRequestsLoading(true);
      const response = await adminAPI.getClockRequests({
        page: clockRequestsPagination.page,
        limit: clockRequestsPagination.limit,
        status: clockRequestsFilter === 'all' ? undefined : clockRequestsFilter,
      });

      setClockRequests(response.requests);
      setClockRequestsPagination(response.pagination);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setClockRequestsLoading(false);
    }
  };

  // Fetch pending counts for sidebar badges
  const fetchPendingCounts = async () => {
    try {
      // Fetch pending clock requests with better error handling
      try {
        const clockResponse = await adminAPI.getClockRequests({
          page: 1,
          limit: 1,
          status: 'pending',
        });

        // Make sure we have the expected response structure
        if (
          clockResponse &&
          clockResponse.pagination &&
          typeof clockResponse.pagination.total === 'number'
        ) {
          setPendingClockRequests(clockResponse.pagination.total);
        } else {
          setPendingClockRequests(0);
        }
      } catch (clockError) {
        console.error('Error fetching clock requests:', clockError);
        setPendingClockRequests(0);
      }

      // Fetch pending leave requests
      try {
        const leaveResponse = await adminAPI.getLeaveRequests({
          page: 1,
          limit: 1,
          status: 'pending',
        });

        if (
          leaveResponse &&
          leaveResponse.pagination &&
          typeof leaveResponse.pagination.total === 'number'
        ) {
          setPendingLeaveRequests(leaveResponse.pagination.total);
        } else {
          setPendingLeaveRequests(0);
        }
      } catch (leaveError) {
        console.error('Leave requests API error:', leaveError);
        setPendingLeaveRequests(0);
      }
    } catch (error) {
      console.error('General error fetching pending counts:', error);
      setPendingClockRequests(0);
      setPendingLeaveRequests(0);
    }
  };

  const handleProcessClockRequest = async (
    id: number,
    action: 'approve' | 'reject',
    adminNotes?: string
  ) => {
    try {
      await adminAPI.processClockRequest(id, action, adminNotes);
      toast.success(`Request ${action}d successfully!`);
      fetchClockRequests(); // Refresh the list
      fetchPendingCounts(); // Refresh pending counts for sidebar badges
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      toast.success('Upload started! You can track the progress below.');

      const result = await adminAPI.uploadAttendanceFile(file);

      // The real-time progress will be handled by the socket connection
      // Once completed, show final success message with detailed information
      let successMessage = `Upload completed! Processed ${result.processedCount} records`;

      if (result.summary) {
        const { newRecords, duplicateRecords, errorRecords, createdUsers } = result.summary;
        successMessage = `Upload completed! ${newRecords} new records`;

        if (duplicateRecords > 0) {
          successMessage += `, ${duplicateRecords} duplicates updated`;
        }

        if (createdUsers > 0) {
          successMessage += `, ${createdUsers} users created`;
        }
      }

      toast.success(successMessage);

      if (result.duplicatesCount && result.duplicatesCount > 0) {
        toast(`🔄 ${result.duplicatesCount} duplicate records were updated with new data`, {
          duration: 6000,
          icon: 'ℹ️',
        });
      }

      if (result.errorCount > 0) {
        const actualErrors = result.errorCount - (result.duplicatesCount || 0);
        if (actualErrors > 0) {
          toast.error(`❌ ${actualErrors} errors occurred during processing`);
        }
      }

      // Refresh the uploads list
      await fetchData();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleViewErrors = async (uploadId: number, uploadName: string) => {
    try {
      const uploadDetails = await adminAPI.getUploadDetails(uploadId);
      setSelectedUploadErrors(uploadDetails.errors || []);
      setSelectedUploadName(uploadName);
      setErrorModalOpen(true);
    } catch (error) {
      toast.error('Failed to load error details');
      console.error('Error fetching upload details:', error);
    }
  };

  // Employee management handlers
  const handleViewEmployeeDetails = (employeeId: number) => {
    navigate(`/admin/employee/${employeeId}`);
  };

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployeeNode(employee);
    setEmployeeDetailsModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployeeModalOpen(true);
  };

  const handleAssignEmployee = (employee: Employee) => {
    setAssigningEmployee(employee);
    setAssignModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${employeeName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await adminAPI.deleteEmployee(employeeId);
      toast.success(`Employee ${employeeName} has been deleted successfully`);
      await fetchData(); // Refresh the employee list
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  // Refresh functions
  const handleRefreshEmployees = async () => {
    try {
      const employeesResponse = await adminAPI.getEmployees({ limit: 10 });
      setEmployees(employeesResponse.employees);
      toast.success('Employee list refreshed');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleRefreshUploads = async () => {
    try {
      const uploadsResponse = await adminAPI.getUploads({ limit: 10 });
      setUploads(uploadsResponse.uploads);
      toast.success('Upload list refreshed');
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  // Sorting and filtering functions
  const handleEmployeeSort = (field: string) => {
    setEmployeeSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleUploadSort = (field: string) => {
    setUploadSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredAndSortedEmployees = employees
    .filter(employee => {
      if (!employeeFilter) return true;
      const searchTerm = employeeFilter.toLowerCase();
      return (
        employee.firstName.toLowerCase().includes(searchTerm) ||
        employee.lastName.toLowerCase().includes(searchTerm) ||
        employee.email.toLowerCase().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      const direction = employeeSort.direction === 'asc' ? 1 : -1;
      switch (employeeSort.field) {
        case 'firstName':
          return direction * a.firstName.localeCompare(b.firstName);
        case 'lastName':
          return direction * a.lastName.localeCompare(b.lastName);
        case 'email':
          return direction * a.email.localeCompare(b.email);
        case 'presentDays':
          return direction * (a.stats.presentDays - b.stats.presentDays);
        case 'absentDays':
          return direction * (a.stats.absentDays - b.stats.absentDays);
        case 'lateDays':
          return direction * (a.stats.lateDays - b.stats.lateDays);
        case 'averageHours':
          return direction * (parseFloat(a.stats.averageHours) - parseFloat(b.stats.averageHours));
        default:
          return 0;
      }
    });

  const filteredAndSortedUploads = uploads
    .filter(upload => {
      if (!uploadFilter) return true;
      const searchTerm = uploadFilter.toLowerCase();
      return (
        upload.original_name.toLowerCase().includes(searchTerm) ||
        formatDate(upload.upload_date).toLowerCase().includes(searchTerm) ||
        upload.status.toLowerCase().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      const direction = uploadSort.direction === 'asc' ? 1 : -1;
      switch (uploadSort.field) {
        case 'original_name':
          return direction * a.original_name.localeCompare(b.original_name);
        case 'upload_date':
          return (
            direction * (new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime())
          );
        case 'records_processed':
          return direction * (a.records_processed - b.records_processed);
        case 'errors_count':
          return direction * (a.errors_count - b.errors_count);
        case 'status':
          return direction * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const SortIcon = ({
    field,
    currentSort,
  }: {
    field: string;
    currentSort: { field: string; direction: 'asc' | 'desc' };
  }) => {
    if (currentSort.field !== field) {
      return <span className="text-gray-400 ml-1">↕</span>;
    }
    return (
      <span className="text-blue-600 ml-1">{currentSort.direction === 'asc' ? '↑' : '↓'}</span>
    );
  };

  const renderOverview = () => {
    if (!metrics) return null;

    return (
      <div className="space-y-6">
        {/* Overview Header with Period Selector and Refresh Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dashboard metrics and analytics for the selected period ({globalDateRange.start} to{' '}
              {globalDateRange.end})
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Period Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Period:
              </label>
              <select
                value={globalPeriod}
                onChange={e => setGlobalPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last 365 days</option>
                <option value="last_year">Last Year</option>
                <option value="this_year">This Year</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <FadeInStagger
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          staggerDelay={0.1}
        >
          <MagicCard gradientColor="#3b82f6" className="p-0">
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                <NumberTicker value={metrics.overall.totalEmployees} />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Employees</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#10b981" className="p-0">
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                <NumberTicker value={parseFloat(metrics.overall.attendanceRate.toString())} />%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#f59e0b" className="p-0">
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                <NumberTicker value={metrics.overall.totalLate} />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Late Check-ins</div>
            </div>
          </MagicCard>

          <MagicCard gradientColor="#8b5cf6" className="p-0">
            <div className="text-center p-6">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                <NumberTicker value={parseFloat(metrics.overall.averageHours)} />h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Hours/Day</div>
            </div>
          </MagicCard>
        </FadeInStagger>

        {/* Top Performers */}
        <Card title="Top Performers" subtitle="Highest attendance rates (30 days)">
          <div className="space-y-4">
            {metrics.topPerformers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {performer.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {performer.email}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {performer.attendanceRate}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Attendance Trends */}
        <Card title="Recent Attendance Trends" subtitle="Daily attendance for the last 7 days">
          <div className="space-y-2">
            {metrics.trends.slice(-7).map(trend => (
              <div key={trend.date} className="flex items-center justify-between py-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(trend.date)}
                </div>
                <div className="flex space-x-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    Present: {trend.present_count}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    Absent: {trend.absent_count}
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Late: {trend.late_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderEmployees = () => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      {/* Header with Create and Refresh Buttons */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee List</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All registered employees with stats for the selected period ({globalDateRange.start} to{' '}
            {globalDateRange.end})
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshEmployees}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setCreateEmployeeModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Employee
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filter Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search employees by name or email..."
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <VirtualizedTable
          data={filteredAndSortedEmployees}
          columns={employeeColumns}
          height={600}
          itemHeight={72}
          loading={loading}
          emptyMessage="No employees found. Create your first employee to get started."
          className="border border-gray-200 dark:border-gray-700 rounded-lg"
        />
      </div>
    </div>
  );

  const renderUploads = () => (
    <div className="space-y-6">
      {/* Socket Connection Status */}
      <div className="flex items-center space-x-2 text-sm">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        ></div>
        <span className="text-gray-600 dark:text-gray-400">
          {isConnected ? 'Connected to server' : 'Disconnected from server'}
        </span>
      </div>

      {/* Real-time Upload Progress */}
      {(uploading || uploadProgress) && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Current Upload Progress
          </h3>
          {uploadProgress && (
            <UploadProgressIndicator
              uploadId={uploadProgress.uploadId}
              phase={uploadProgress.phase}
              totalRecords={uploadProgress.totalRecords}
              processedCount={uploadProgress.processedCount}
              errorCount={uploadProgress.errorCount}
              progress={uploadProgress.progress}
              currentRecord={uploadProgress.currentRecord}
              status={uploadProgress.status}
              error={uploadProgress.error}
            />
          )}
        </div>
      )}

      {/* Upload Section */}
      <Card title="Upload Attendance Data" subtitle="Upload CSV file with attendance records">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="csvFile"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Attendance File
            </label>
            <input
              type="file"
              id="attendanceFile"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Upload in progress... Please wait.
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Supported File Formats:</p>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>
                <strong>CSV:</strong> email, date, clock_in, clock_out, status, notes
              </li>
              <li>
                <strong>Excel:</strong> First Name, Last Name, ID, Date, Clock-In Time, Clock-Out
                Time, Attendance Status, Worked Hours
              </li>
            </ul>
            <p className="font-medium mb-1">Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Input date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY</li>
              <li>Display format: DD/MMM/YYYY (e.g., 04/Jul/2025)</li>
              <li>Time formats: HH:MM, HH:MM:SS, h:mm AM/PM</li>
              <li>Status: present, absent, late, early_leave</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Upload History */}
      <Card
        title="Upload History"
        subtitle="Recent CSV uploads"
        action={
          <button
            onClick={handleRefreshUploads}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      >
        {/* Filter Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search uploads by filename, date, or status..."
            value={uploadFilter}
            onChange={e => setUploadFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <VirtualizedTable
          data={filteredAndSortedUploads}
          columns={uploadColumns}
          height={500}
          itemHeight={60}
          loading={loading}
          emptyMessage="No file uploads found. Upload your first CSV file to get started."
          className="border border-gray-200 dark:border-gray-700 rounded-lg"
        />
      </Card>
    </div>
  );

  const renderAttendanceRecords = () => {
    const getStatusBadge = (status: string) => {
      const baseClasses = 'inline-flex px-2 py-1 text-xs font-medium rounded-full';
      switch (status) {
        case 'present':
          return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
        case 'absent':
          return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
        case 'late':
          return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
        case 'early_leave':
          return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      }
    };

    const handlePeriodChange = (newPeriod: string) => {
      setAttendancePeriod(newPeriod);
      setAttendancePage(1); // Reset to first page when changing period
    };

    const handleSearchChange = (newSearch: string) => {
      setAttendanceSearch(newSearch);
      setAttendancePage(1); // Reset to first page when searching
    };

    const handlePageChange = (page: number) => {
      setAttendancePage(page);
    };

    const handleLimitChange = (newLimit: number) => {
      setAttendanceLimit(newLimit);
      setAttendancePage(1); // Reset to first page when changing limit
    };

    const handleStatusFilterChange = (status: string) => {
      setAttendanceStatusFilter(status);
      setAttendancePage(1); // Reset to first page when changing filter
    };

    const handleDepartmentFilterChange = (department: string) => {
      setAttendanceDepartmentFilter(department);
      setAttendancePage(1); // Reset to first page when changing filter
    };

    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        // Filter attendance records for select all
        const filteredRecords = attendanceRecords.filter(record => {
          const statusMatch = !attendanceStatusFilter || record.status === attendanceStatusFilter;
          const departmentMatch =
            !attendanceDepartmentFilter ||
            record.employee.team?.name?.toLowerCase() === attendanceDepartmentFilter;
          return statusMatch && departmentMatch;
        });
        setSelectedAttendanceRecords(filteredRecords.map(record => record.id));
      } else {
        setSelectedAttendanceRecords([]);
      }
    };

    const handleSelectRecord = (recordId: number, checked: boolean) => {
      if (checked) {
        setSelectedAttendanceRecords(prev => [...prev, recordId]);
      } else {
        setSelectedAttendanceRecords(prev => prev.filter(id => id !== recordId));
      }
    };

    const handleExportCSV = () => {
      // Filter records for export
      const recordsToExport = attendanceRecords.filter(record => {
        const statusMatch = !attendanceStatusFilter || record.status === attendanceStatusFilter;
        const departmentMatch =
          !attendanceDepartmentFilter ||
          record.employee.team?.name?.toLowerCase() === attendanceDepartmentFilter;
        return statusMatch && departmentMatch;
      });

      // Create CSV content
      const headers = [
        'Employee',
        'Date',
        'Clock In',
        'Clock Out',
        'Hours Worked',
        'Status',
        'Department',
      ];
      const csvContent = [
        headers.join(','),
        ...recordsToExport.map(record =>
          [
            `"${record.employee.firstName} ${record.employee.lastName}"`,
            record.date,
            record.clock_in || 'N/A',
            record.clock_out || 'N/A',
            record.hours_worked ? `${record.hours_worked}h` : 'N/A',
            record.status.replace('_', ' '),
            record.employee.team?.name || 'N/A',
          ].join(',')
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-records-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${recordsToExport.length} attendance records successfully!`);
    };

    const handleGenerateReport = () => {
      const stats = calculateStats();
      const reportContent = `
Attendance Report
Generated on: ${new Date().toLocaleDateString()}
Period: ${attendanceDateRange.start} to ${attendanceDateRange.end}

Summary Statistics:
- Total Records: ${stats.totalRecords}
- Attendance Rate: ${stats.attendanceRate.toFixed(1)}%
- Total Hours: ${stats.totalHours.toFixed(1)}h
- Average Hours/Day: ${stats.avgHours.toFixed(1)}h

Status Breakdown:
- Present: ${stats.presentCount}
- Absent: ${stats.absentCount}
- Late: ${stats.lateCount}
- Early Leave: ${stats.earlyLeaveCount}
      `;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance report generated successfully!');
    };

    const handleBulkAction = () => {
      if (selectedAttendanceRecords.length === 0) {
        toast.error('Please select records to perform bulk actions');
        return;
      }
      toast.success(`Selected ${selectedAttendanceRecords.length} records for bulk action`);
      // Add bulk action logic here
    };

    const handleEditRecord = (recordId: number) => {
      toast.success(`Edit functionality for record ${recordId} - Coming soon!`);
      // Add edit record logic here
    };

    const handleDeleteRecord = (recordId: number) => {
      if (window.confirm('Are you sure you want to delete this attendance record?')) {
        toast.success(`Delete functionality for record ${recordId} - Coming soon!`);
        // Add delete record logic here
      }
    };

    // Calculate attendance statistics
    const calculateStats = () => {
      // Filter records first
      const recordsToCalculate = attendanceRecords.filter(record => {
        const statusMatch = !attendanceStatusFilter || record.status === attendanceStatusFilter;
        const departmentMatch =
          !attendanceDepartmentFilter ||
          record.employee.team?.name?.toLowerCase() === attendanceDepartmentFilter;
        return statusMatch && departmentMatch;
      });

      if (!recordsToCalculate.length)
        return {
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          earlyLeaveCount: 0,
          totalHours: 0,
          avgHours: 0,
          attendanceRate: 0,
        };

      const stats = recordsToCalculate.reduce(
        (acc, record) => {
          acc.totalRecords++;
          if (record.status === 'present') acc.presentCount++;
          if (record.status === 'absent') acc.absentCount++;
          if (record.status === 'late') acc.lateCount++;
          if (record.status === 'early_leave') acc.earlyLeaveCount++;
          if (record.hours_worked) acc.totalHours += parseFloat(String(record.hours_worked));
          return acc;
        },
        {
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          earlyLeaveCount: 0,
          totalHours: 0,
        }
      );

      return {
        ...stats,
        avgHours: stats.totalRecords > 0 ? stats.totalHours / stats.totalRecords : 0,
        attendanceRate:
          stats.totalRecords > 0
            ? ((stats.presentCount + stats.lateCount + stats.earlyLeaveCount) /
                stats.totalRecords) *
              100
            : 0,
      };
    };

    const stats = calculateStats();

    // Filter attendance records based on status and department
    const filteredAttendanceRecords = attendanceRecords.filter(record => {
      const statusMatch = !attendanceStatusFilter || record.status === attendanceStatusFilter;
      const departmentMatch =
        !attendanceDepartmentFilter ||
        record.employee.team?.name?.toLowerCase() === attendanceDepartmentFilter;
      return statusMatch && departmentMatch;
    });

    return (
      <div className="space-y-6">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Records</p>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
              </div>
              <div className="p-3 bg-blue-400 bg-opacity-30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Attendance Rate</p>
                <p className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-green-400 bg-opacity-30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 bg-orange-400 bg-opacity-30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Avg Hours/Day</p>
                <p className="text-2xl font-bold">{stats.avgHours.toFixed(1)}h</p>
              </div>
              <div className="p-3 bg-purple-400 bg-opacity-30 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Status Breakdown
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.presentCount}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Present</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.absentCount}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Absent</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.lateCount}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Late</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.earlyLeaveCount}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Early Leave</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h4>
            <div className="space-y-3">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </button>
              <button
                onClick={handleGenerateReport}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generate Report
              </button>
              <button
                onClick={handleBulkAction}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3a4 4 0 118 0v4m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
                Bulk Actions
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Filters and Search */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          {/* Header with Filters and Refresh */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Attendance Records
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All attendance records for the selected period ({attendanceDateRange.start} to{' '}
                  {attendanceDateRange.end})
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors duration-200">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
                    />
                  </svg>
                  Filters
                </button>
                <button
                  onClick={fetchAttendanceRecords}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Enhanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Period:
                </label>
                <select
                  value={attendancePeriod}
                  onChange={e => handlePeriodChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last 365 days</option>
                  <option value="last_year">Last Year</option>
                  <option value="this_year">This Year</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_week">This Week</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status:
                </label>
                <select
                  value={attendanceStatusFilter}
                  onChange={e => handleStatusFilterChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="early_leave">Early Leave</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department:
                </label>
                <select
                  value={attendanceDepartmentFilter}
                  onChange={e => {
                    console.log('🔄 Department filter changed:', e.target.value);
                    handleDepartmentFilterChange(e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Departments</option>
                  {(() => {
                    console.log('🎯 Rendering dropdown with availableTeams:', availableTeams);
                    console.log('🎯 availableTeams.length:', availableTeams.length);
                    console.log('🎯 availableTeams type:', typeof availableTeams);
                    console.log('🎯 availableTeams isArray:', Array.isArray(availableTeams));

                    return availableTeams.map((team, index) => {
                      console.log(`🎯 Rendering team option ${index}:`, {
                        id: team.id,
                        name: team.name,
                      });
                      return (
                        <option key={team.id} value={team.name.toLowerCase()}>
                          {team.name}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Per page:
                </label>
                <select
                  value={attendanceLimit}
                  onChange={e => handleLimitChange(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="text"
                placeholder="Search by employee name, email, department, or notes..."
                value={attendanceSearch}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Records Count and Pagination Info */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing{' '}
              {attendancePagination.total > 0 ? (attendancePage - 1) * attendanceLimit + 1 : 0} to{' '}
              {Math.min(attendancePage * attendanceLimit, attendancePagination.total)} of{' '}
              {attendancePagination.total} records
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        selectedAttendanceRecords.length === filteredAttendanceRecords.length &&
                        filteredAttendanceRecords.length > 0
                      }
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAttendanceRecords.length > 0 ? (
                  filteredAttendanceRecords.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAttendanceRecords.includes(record.id)}
                          onChange={e => handleSelectRecord(record.id, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {record.employee.firstName.charAt(0)}
                                {record.employee.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {record.employee.firstName} {record.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {record.employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.clock_in ? formatTime(record.clock_in) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.clock_out ? formatTime(record.clock_out) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.hours_worked ? `${record.hours_worked}h` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(record.status)}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record.employee.team?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRecord(record.id)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No attendance records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Records Count and Pagination Info */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAttendanceRecords.length} of {attendancePagination.total} records
              {(attendanceStatusFilter || attendanceDepartmentFilter) && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">(filtered)</span>
              )}
            </div>
          </div>

          {/* Pagination */}
          {attendancePagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-center">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={attendancePage <= 1}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    First
                  </button>

                  <button
                    onClick={() => handlePageChange(attendancePage - 1)}
                    disabled={attendancePage <= 1}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, attendancePagination.pages) }, (_, i) => {
                    let pageNum: number;
                    if (attendancePagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (attendancePage <= 3) {
                      pageNum = i + 1;
                    } else if (attendancePage >= attendancePagination.pages - 2) {
                      pageNum = attendancePagination.pages - 4 + i;
                    } else {
                      pageNum = attendancePage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md ${
                          attendancePage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(attendancePage + 1)}
                    disabled={attendancePage >= attendancePagination.pages}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Next
                  </button>

                  <button
                    onClick={() => handlePageChange(attendancePagination.pages)}
                    disabled={attendancePage >= attendancePagination.pages}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderClockRequests = () => {
    const handleFilterChange = (newFilter: 'pending' | 'approved' | 'rejected' | 'all') => {
      setClockRequestsFilter(newFilter);
      setClockRequestsPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const handlePageChange = (page: number) => {
      setClockRequestsPagination(prev => ({ ...prev, page }));
    };

    const handleLimitChange = (newLimit: number) => {
      setClockRequestsPagination({
        page: 1,
        limit: newLimit,
        total: clockRequestsPagination.total,
        pages: Math.ceil(clockRequestsPagination.total / newLimit),
      });
    };

    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {/* Header with Filters and Refresh */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Clock Requests
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage and review employee clock requests
              </p>
            </div>
            <button
              onClick={() => fetchClockRequests()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </label>
              <select
                value={clockRequestsFilter}
                onChange={e =>
                  handleFilterChange(e.target.value as 'pending' | 'approved' | 'rejected' | 'all')
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search by employee name or date..."
                // value={attendanceSearch}
                // onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Per page:
              </label>
              <select
                value={clockRequestsPagination.limit}
                onChange={e => handleLimitChange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Count and Pagination Info */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing{' '}
            {clockRequestsPagination.total > 0
              ? (clockRequestsPagination.page - 1) * clockRequestsPagination.limit + 1
              : 0}{' '}
            to{' '}
            {Math.min(
              clockRequestsPagination.page * clockRequestsPagination.limit,
              clockRequestsPagination.total
            )}{' '}
            of {clockRequestsPagination.total} requests
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Request Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Requested Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {clockRequestsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : clockRequests.length > 0 ? (
                clockRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.userName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {request.userEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          request.requestType === 'clock_in'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                        }`}
                      >
                        {request.requestType === 'clock_in' ? 'Clock In' : 'Clock Out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {request.requestedTime ? formatDateTime(request.requestedTime) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {request.reason || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {request.adminNotes || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleProcessClockRequest(request.id, 'approve', 'Approved by admin')
                            }
                            className="inline-flex items-center px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleProcessClockRequest(request.id, 'reject', 'Rejected by admin')
                            }
                            className="inline-flex items-center px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {request.status}{' '}
                          {request.processedAt ? `on ${formatDateTime(request.processedAt)}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No clock requests found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {clockRequestsPagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-center">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={clockRequestsPagination.page <= 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  First
                </button>

                <button
                  onClick={() => handlePageChange(clockRequestsPagination.page - 1)}
                  disabled={clockRequestsPagination.page <= 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, clockRequestsPagination.pages) }, (_, i) => {
                  let pageNum: number;
                  if (clockRequestsPagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (clockRequestsPagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (clockRequestsPagination.page >= clockRequestsPagination.pages - 2) {
                    pageNum = clockRequestsPagination.pages - 4 + i;
                  } else {
                    pageNum = clockRequestsPagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md ${
                        clockRequestsPagination.page === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(clockRequestsPagination.page + 1)}
                  disabled={clockRequestsPagination.page >= clockRequestsPagination.pages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Next
                </button>

                <button
                  onClick={() => handlePageChange(clockRequestsPagination.pages)}
                  disabled={clockRequestsPagination.page >= clockRequestsPagination.pages}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as typeof activeTab);
  };

  if (loading) {
    return (
      <DashboardLayout activeTab="overview" onTabChange={handleTabChange}>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'employees':
        return renderEmployees();
      case 'attendance':
        return renderAttendanceRecords();
      case 'clock-requests':
        return renderClockRequests();
      case 'leave-requests':
        return <LeaveRequestsManagementWithSuspense />;
      case 'org-chart':
        return <ReactFlowOrganizationalChartWithSuspense />;
      case 'careers':
        return <CareersManagement />;
      case 'settings':
        return <AdminSettings />;
      case 'monitoring':
        return <DashboardMonitoring />;
      default:
        return renderOverview();
    }
  };

  return (
    <ReactPerformanceProfiler id="AdminDashboard" threshold={200}>
      <DashboardLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pendingClockRequests={pendingClockRequests}
        pendingLeaveRequests={pendingLeaveRequests}
      >
        {renderContent()}

        {/* Error Details Modal */}
        <ErrorDetailsModal
          isOpen={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          errors={selectedUploadErrors}
          uploadName={selectedUploadName}
        />

        <CreateEmployeeModal
          isOpen={createEmployeeModalOpen}
          onClose={() => setCreateEmployeeModalOpen(false)}
          onEmployeeCreated={() => {
            fetchData(); // Refresh the data after creating an employee
          }}
        />

        <EditEmployeeModal
          isOpen={editEmployeeModalOpen}
          onClose={() => {
            setEditEmployeeModalOpen(false);
            setEditingEmployee(null);
          }}
          employee={editingEmployee}
          onEmployeeUpdated={() => {
            fetchData(); // Refresh the data after updating an employee
            setEditEmployeeModalOpen(false);
            setEditingEmployee(null);
          }}
        />

        <AssignEmployeeModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setAssigningEmployee(null);
          }}
          employee={assigningEmployee}
          onEmployeeUpdated={() => {
            fetchData(); // Refresh the data after updating assignment
            setAssignModalOpen(false);
            setAssigningEmployee(null);
          }}
        />

        <EmployeeDetailsModal
          isOpen={employeeDetailsModalOpen}
          onClose={() => {
            setEmployeeDetailsModalOpen(false);
            setSelectedEmployeeNode(null);
          }}
          employee={selectedEmployeeNode}
        />
      </DashboardLayout>
    </ReactPerformanceProfiler>
  );
};

export default AdminDashboard;
