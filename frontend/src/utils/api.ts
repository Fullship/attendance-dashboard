import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  User,
  AttendanceRecord,
  AttendanceStats,
  Employee,
  FileUpload,
  AdminMetrics,
  AuthResponse,
  ApiError,
  PaginationInfo,
  CalendarData,
  UploadResponse,
  AttendanceSettingsData,
  AttendanceSetting,
  Holiday,
  WorkSchedule,
  Location,
  Team,
  AttendanceRule,
  Role,
  Permission,
  HierarchyLevel,
  SystemSetting,
} from '../types';

// Get API base URL with production fallback
const getApiBaseUrl = () => {
  // If we have the environment variable, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // If we're on production domain, use production API
  if (window.location.hostname === 'my.fullship.net') {
    return 'https://my.fullship.net/api';
  }
  
  // Default to localhost for development
  return 'http://localhost:3002/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (firstName: string, lastName: string): Promise<User> => {
    const response = await api.put('/users/profile', { firstName, lastName });
    return response.data;
  },

  submitClockRequest: async (requestData: {
    requestType: 'clock_in' | 'clock_out';
    requestedTime: string;
    reason: string;
  }): Promise<{ message: string; request: any }> => {
    const response = await api.post('/users/clock-request', requestData);
    return response.data;
  },

  getClockRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    requests: any[];
    pagination: PaginationInfo;
  }> => {
    const response = await api.get('/users/clock-requests', { params });
    return response.data;
  },

  // Employee Leave Management
  getLeaveBalance: async (
    year?: number
  ): Promise<{
    leaveAllocations: any;
    usedLeave: any;
    currentSemiAnnual: string;
    balanceDetails: any;
  }> => {
    const response = await api.get('/enhanced-leave/leave-balance', {
      params: year ? { year } : {},
    });
    return response.data;
  },

  submitLeaveRequest: async (requestData: {
    leaveType: string;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
    reason: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    supportingDocument?: File;
  }): Promise<{ message: string; leaveRequest: any }> => {
    const formData = new FormData();

    // Only include halfDayPeriod if halfDay is true
    const sanitizedData = { ...requestData };
    if (!sanitizedData.halfDay) {
      delete sanitizedData.halfDayPeriod;
      delete sanitizedData.halfDay; // Don't send halfDay: false at all
    }

    Object.entries(sanitizedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'supportingDocument' && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          // Convert boolean to string properly for FormData
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await api.post('/enhanced-leave/leave-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getMyLeaveRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    leaveType?: string;
    year?: number;
    force?: boolean;
  }): Promise<{
    leaveRequests: any[];
    pagination: PaginationInfo;
    stats: any;
  }> => {
    const response = await api.get('/enhanced-leave/my-leave-requests', { params });
    return response.data;
  },

  cancelLeaveRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/enhanced-leave/leave-request/${requestId}`);
    return response.data;
  },
};

// Attendance API
export const attendanceAPI = {
  getRecords: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    records: AttendanceRecord[];
    pagination: PaginationInfo;
  }> => {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  },

  getStats: async (
    period?: string
  ): Promise<{
    summary: AttendanceStats;
    times: {
      earliestClockIn: string;
      latestClockIn: string;
      earliestClockOut: string;
      latestClockOut: string;
    };
    monthly: Array<{
      month: string;
      total_days: number;
      present_days: number;
      avg_hours: number;
    }>;
  }> => {
    const response = await api.get('/attendance/stats', { params: { period } });
    return response.data;
  },

  getCalendar: async (month?: number, year?: number, force?: boolean): Promise<CalendarData> => {
    const response = await api.get('/attendance/calendar', {
      params: { month, year, force },
    });
    return response.data;
  },

  clockIn: async (): Promise<{ message: string; record: AttendanceRecord }> => {
    const response = await api.post('/attendance/clock-in');
    return response.data;
  },

  clockOut: async (): Promise<{ message: string; record: AttendanceRecord }> => {
    const response = await api.post('/attendance/clock-out');
    return response.data;
  },

  getHolidays: async (): Promise<Holiday[]> => {
    const response = await api.get('/attendance/holidays');
    return response.data.holidays || [];
  },
};

// Admin API
export const adminAPI = {
  getEmployees: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    period?: string;
  }): Promise<{
    employees: Employee[];
    pagination: PaginationInfo;
    period?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  }> => {
    const response = await api.get('/admin/employees', { params });
    return response.data;
  },

  getEmployee: async (
    id: number,
    period?: string,
    page?: number,
    limit?: number
  ): Promise<{
    employee: Employee;
    stats: AttendanceStats;
    recentRecords: AttendanceRecord[];
    dateRange: string;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await api.get(`/admin/employees/${id}`, {
      params: { period, page, limit },
    });
    return response.data;
  },

  getEmployeeById: async (
    id: number
  ): Promise<{
    employee: Employee;
  }> => {
    const response = await api.get(`/admin/employees/${id}`, {
      params: { period: '7' }, // Use minimal period for basic info
    });
    return response.data;
  },

  createEmployee: async (employeeData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    isAdmin?: boolean;
  }): Promise<{
    message: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      isAdmin: boolean;
      createdAt: string;
    };
  }> => {
    const response = await api.post('/admin/employees', employeeData);
    return response.data;
  },

  updateEmployee: async (
    id: number,
    employeeData: {
      firstName: string;
      lastName: string;
      email: string;
      isAdmin?: boolean;
    }
  ): Promise<{
    message: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      isAdmin: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }> => {
    const response = await api.put(`/admin/employees/${id}`, employeeData);
    return response.data;
  },

  deleteEmployee: async (
    id: number
  ): Promise<{
    message: string;
    deletedUser: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }> => {
    const response = await api.delete(`/admin/employees/${id}`);
    return response.data;
  },

  uploadAttendanceFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('attendanceFile', file);

    const response = await api.post('/admin/upload-attendance', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUploads: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    uploads: FileUpload[];
    pagination: PaginationInfo;
  }> => {
    const response = await api.get('/admin/uploads', { params });
    return response.data;
  },

  getUploadDetails: async (uploadId: number): Promise<FileUpload & { errors: string[] }> => {
    const response = await api.get(`/admin/uploads/${uploadId}`);
    return response.data;
  },

  getMetrics: async (period?: string): Promise<AdminMetrics> => {
    const response = await api.get('/admin/metrics', { params: { period } });
    return response.data;
  },

  getAttendanceRecords: async (params?: {
    page?: number;
    limit?: number;
    period?: string;
    search?: string;
  }): Promise<{
    records: (AttendanceRecord & {
      employee: {
        firstName: string;
        lastName: string;
        email: string;
      };
    })[];
    pagination: PaginationInfo;
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
  }> => {
    const response = await api.get('/admin/attendance-records', { params });
    return response.data;
  },

  getClockRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    requests: any[];
    pagination: PaginationInfo;
  }> => {
    const response = await api.get('/admin/clock-requests', { params });
    return response.data;
  },

  processClockRequest: async (
    id: number,
    action: 'approve' | 'reject',
    adminNotes?: string
  ): Promise<{
    message: string;
    request: any;
  }> => {
    const response = await api.put(`/admin/clock-requests/${id}`, { action, adminNotes });
    return response.data;
  },

  // Settings management
  getSettings: async (): Promise<AttendanceSettingsData> => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSetting: async (
    settingName: string,
    value: string
  ): Promise<{ message: string; setting: AttendanceSetting }> => {
    const response = await api.put(`/admin/settings/${settingName}`, { value });
    return response.data;
  },

  addHoliday: async (
    holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<{ message: string; holiday: Holiday }> => {
    const response = await api.post('/admin/holidays', holiday);
    return response.data;
  },

  updateHoliday: async (
    id: number,
    holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<{ message: string; holiday: Holiday }> => {
    const response = await api.put(`/admin/holidays/${id}`, holiday);
    return response.data;
  },

  deleteHoliday: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/holidays/${id}`);
    return response.data;
  },

  addWorkSchedule: async (
    schedule: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<{ message: string; schedule: WorkSchedule }> => {
    // Convert frontend format to backend API format
    const apiSchedule = {
      name: schedule.name,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      daysOfWeek: schedule.days_of_week,
      isDefault: schedule.is_default,
    };
    const response = await api.post('/admin/work-schedules', apiSchedule);
    return response.data;
  },

  updateWorkSchedule: async (
    id: number,
    schedule: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<{ message: string; schedule: WorkSchedule }> => {
    // Convert frontend format to backend API format
    const apiSchedule = {
      name: schedule.name,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      daysOfWeek: schedule.days_of_week,
      isDefault: schedule.is_default,
    };
    const response = await api.put(`/admin/work-schedules/${id}`, apiSchedule);
    return response.data;
  },

  deleteWorkSchedule: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/work-schedules/${id}`);
    return response.data;
  },

  // Locations management
  getLocations: async (): Promise<{
    locations: (Location & { employeeCount: number; teamCount: number })[];
  }> => {
    const response = await api.get('/admin/locations');
    return response.data;
  },

  createLocation: async (locationData: {
    name: string;
    address?: string;
    timezone: string;
  }): Promise<{ message: string; location: Location }> => {
    const response = await api.post('/admin/locations', locationData);
    return response.data;
  },

  updateLocation: async (
    id: number,
    locationData: {
      name: string;
      address?: string;
      timezone: string;
      isActive: boolean;
    }
  ): Promise<{ message: string; location: Location }> => {
    const response = await api.put(`/admin/locations/${id}`, locationData);
    return response.data;
  },

  deleteLocation: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/locations/${id}`);
    return response.data;
  },

  // Teams management
  getTeams: async (
    locationId?: number
  ): Promise<{
    teams: (Team & { employeeCount: number })[];
  }> => {
    const params = locationId ? { locationId } : {};
    const response = await api.get('/admin/teams', { params });
    return response.data;
  },

  createTeam: async (teamData: {
    name: string;
    locationId?: number;
    description?: string;
    managerId?: number;
  }): Promise<{ message: string; team: Team }> => {
    const response = await api.post('/admin/teams', teamData);
    return response.data;
  },

  updateTeam: async (
    id: number,
    teamData: {
      name: string;
      locationId?: number;
      description?: string;
      managerId?: number;
      isActive: boolean;
    }
  ): Promise<{ message: string; team: Team }> => {
    const response = await api.put(`/admin/teams/${id}`, teamData);
    return response.data;
  },

  deleteTeam: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/teams/${id}`);
    return response.data;
  },

  // Attendance Rules management (replaces settings)
  getAttendanceRules: async (
    ruleType?: string,
    targetId?: number
  ): Promise<{
    rules: AttendanceRule[];
  }> => {
    const params: any = {};
    if (ruleType) params.ruleType = ruleType;
    if (targetId) params.targetId = targetId;
    const response = await api.get('/admin/attendance-rules', { params });
    return response.data;
  },

  createAttendanceRule: async (ruleData: {
    ruleName: string;
    ruleType: 'global' | 'location' | 'team';
    targetId?: number;
    ruleKey: string;
    ruleValue: string;
    description?: string;
  }): Promise<{ message: string; rule: AttendanceRule }> => {
    const response = await api.post('/admin/attendance-rules', ruleData);
    return response.data;
  },

  updateAttendanceRule: async (
    id: number,
    ruleData: {
      ruleName: string;
      ruleValue: string;
      description?: string;
      isActive: boolean;
    }
  ): Promise<{ message: string; rule: AttendanceRule }> => {
    const response = await api.put(`/admin/attendance-rules/${id}`, ruleData);
    return response.data;
  },

  deleteAttendanceRule: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/attendance-rules/${id}`);
    return response.data;
  },

  // Employee assignment
  updateEmployeeAssignment: async (
    employeeId: number,
    assignment: {
      locationId?: number;
      teamId?: number;
    }
  ): Promise<{
    message: string;
    employee: { id: number; locationId?: number; teamId?: number };
  }> => {
    const response = await api.put(`/admin/employees/${employeeId}/assignment`, assignment);
    return response.data;
  },

  // Timezone management
  getTimezoneSummary: async (): Promise<{
    summary: any;
  }> => {
    const response = await api.get('/admin/timezone-summary');
    return response.data;
  },

  validateTimestamps: async (
    timestamps: string[],
    locationId?: number,
    employeeId?: number
  ): Promise<{
    validation: any;
  }> => {
    const response = await api.post('/admin/validate-timestamps', {
      timestamps,
      locationId,
      employeeId,
    });
    return response.data;
  },

  getAttendanceByTimezone: async (
    startDate: string,
    endDate: string
  ): Promise<{
    attendance: any;
  }> => {
    const response = await api.get('/admin/attendance-by-timezone', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  uploadAttendanceWithTimezone: async (
    file: File,
    validateTimezone?: boolean
  ): Promise<{
    message: string;
    validation?: any;
    errors?: any;
  }> => {
    const formData = new FormData();
    formData.append('attendanceFile', file);
    if (validateTimezone) {
      formData.append('validateTimezone', 'true');
    }

    const response = await api.post('/admin/upload-attendance-with-timezone', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin Leave Management
  getLeaveRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    leaveType?: string;
    year?: string;
  }): Promise<{
    leaveRequests: any[];
    statistics: {
      pending: number;
      approved: number;
      rejected: number;
      cancelled: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await api.get('/admin-leave/admin/leave-requests', { params });
    return response.data;
  },

  reviewLeaveRequest: async (
    requestId: number,
    data: {
      action: 'approve' | 'reject';
      adminNotes: string;
    }
  ): Promise<{ message: string }> => {
    const response = await api.put(`/admin-leave/admin/leave-request/${requestId}/review`, data);
    return response.data;
  },

  // Admin Panel APIs
  getCacheStats: async (): Promise<any> => {
    const response = await api.get('/admin/cache/stats');
    return response.data;
  },

  clearCache: async (): Promise<{ message: string; keysCleared: number }> => {
    const response = await api.post('/admin/cache/clear');
    return response.data;
  },

  getClusterStatus: async (): Promise<any> => {
    const response = await api.get('/admin/cluster/status');
    return response.data;
  },

  restartCluster: async (): Promise<{ message: string }> => {
    const response = await api.post('/admin/cluster/restart');
    return response.data;
  },

  restartWorker: async (workerId: number): Promise<{ message: string }> => {
    const response = await api.post(`/admin/cluster/restart-worker/${workerId}`);
    return response.data;
  },

  getProfilerStatus: async (): Promise<any> => {
    const response = await api.get('/admin/profiler/status');
    return response.data;
  },

  startCpuProfiling: async (duration: number): Promise<{ message: string }> => {
    const response = await api.post('/admin/profiler/cpu/start', { duration });
    return response.data;
  },

  stopCpuProfiling: async (): Promise<{ message: string; filename: string; downloadUrl: string; size?: number }> => {
    const response = await api.post('/admin/profiler/cpu/stop');
    return response.data;
  },

  takeMemorySnapshot: async (): Promise<{ message: string; filename: string; downloadUrl: string; size?: number }> => {
    const response = await api.post('/admin/profiler/memory/snapshot');
    return response.data;
  },

  startMemoryProfiling: async (): Promise<{ message: string }> => {
    const response = await api.post('/admin/profiler/memory/start');
    return response.data;
  },

  stopMemoryProfiling: async (): Promise<{ message: string; filename?: string; downloadUrl?: string; size?: number }> => {
    const response = await api.post('/admin/profiler/memory/stop');
    return response.data;
  },

  getMemorySnapshots: async (): Promise<{ profiles: any[] }> => {
    const response = await api.get('/admin/profiler/memory/snapshots');
    return response.data;
  },

  getLogs: async (params?: {
    page?: number;
    limit?: number;
    level?: string;
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: any[];
    pagination: any;
    filters: any;
  }> => {
    const response = await api.get('/admin/logs', { params });
    return response.data;
  },

  exportLogs: async (params?: {
    level?: string;
    source?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
  }): Promise<Blob> => {
    const response = await api.get('/admin/logs/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },
};

// Role API
export const roleAPI = {
  // Roles
  getRoles: async (): Promise<{ roles: any[] }> => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  createRole: async (roleData: {
    name: string;
    description?: string;
    permissions: number[];
  }): Promise<{ message: string; role: any }> => {
    const response = await api.post('/admin/roles', roleData);
    return response.data;
  },

  updateRole: async (
    id: number,
    roleData: {
      name: string;
      description?: string;
      permissions: number[];
      isActive: boolean;
    }
  ): Promise<{ message: string; role: any }> => {
    const response = await api.put(`/admin/roles/${id}`, roleData);
    return response.data;
  },

  deleteRole: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/roles/${id}`);
    return response.data;
  },

  // Permissions
  getPermissions: async (): Promise<{ permissions: any[] }> => {
    const response = await api.get('/admin/permissions');
    return response.data;
  },

  createPermission: async (permissionData: {
    name: string;
    description?: string;
    resource: string;
    action: string;
  }): Promise<{ message: string; permission: any }> => {
    const response = await api.post('/admin/permissions', permissionData);
    return response.data;
  },

  updatePermission: async (
    id: number,
    permissionData: {
      name: string;
      description?: string;
      resource: string;
      action: string;
      isActive: boolean;
    }
  ): Promise<{ message: string; permission: any }> => {
    const response = await api.put(`/admin/permissions/${id}`, permissionData);
    return response.data;
  },

  deletePermission: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/permissions/${id}`);
    return response.data;
  },

  // Hierarchy Levels
  getHierarchyLevels: async (): Promise<{ levels: any[] }> => {
    const response = await api.get('/admin/hierarchy-levels');
    return response.data;
  },

  createHierarchyLevel: async (levelData: {
    name: string;
    level: number;
    description?: string;
    reportingToLevel?: number;
  }): Promise<{ message: string; level: any }> => {
    const response = await api.post('/admin/hierarchy-levels', levelData);
    return response.data;
  },

  updateHierarchyLevel: async (
    id: number,
    levelData: {
      name: string;
      level: number;
      description?: string;
      reportingToLevel?: number;
      isActive: boolean;
    }
  ): Promise<{ message: string; level: any }> => {
    const response = await api.put(`/admin/hierarchy-levels/${id}`, levelData);
    return response.data;
  },

  deleteHierarchyLevel: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/hierarchy-levels/${id}`);
    return response.data;
  },

  // System Settings
  getSystemSettings: async (): Promise<{ settings: any[] }> => {
    const response = await api.get('/admin/system-settings');
    return response.data;
  },

  updateSystemSetting: async (
    key: string,
    value: any
  ): Promise<{ message: string; setting: any }> => {
    const response = await api.put(`/admin/system-settings/${key}`, { value });
    return response.data;
  },

  // Employee Role Assignment
  assignEmployeeRole: async (
    employeeId: number,
    roleId: number,
    hierarchyLevelId?: number
  ): Promise<{ message: string }> => {
    const response = await api.post(`/admin/employees/${employeeId}/assign-role`, {
      roleId,
      hierarchyLevelId,
    });
    return response.data;
  },

  removeEmployeeRole: async (employeeId: number, roleId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/admin/employees/${employeeId}/roles/${roleId}`);
    return response.data;
  },

  getEmployeeRoles: async (employeeId: number): Promise<{ roles: any[]; hierarchyLevel?: any }> => {
    const response = await api.get(`/admin/employees/${employeeId}/roles`);
    return response.data;
  },
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;
