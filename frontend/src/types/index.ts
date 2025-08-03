export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  locationId?: number;
  teamId?: number;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number;
  status: 'present' | 'absent' | 'late' | 'early_leave';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStats {
  totalRecords: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays?: number;
  averageHours: string;
  totalHours?: string;
}

export interface Employee {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isAdmin?: boolean;
  locationId?: number;
  teamId?: number;
  stats: AttendanceStats;
  location?: Location;
  team?: Team;
  phoneNumber?: string;
  isActive?: boolean;
  joinDate?: string;
  lastLogin?: string;
}

export interface FileUpload {
  id: number;
  filename: string;
  original_name: string;
  uploaded_by: number;
  records_processed: number;
  errors_count: number;
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  upload_date: string;
}

export interface AdminMetrics {
  overall: {
    totalEmployees: number;
    totalRecords: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    averageHours: string;
    attendanceRate: string;
  };
  topPerformers: Array<{
    id: number;
    name: string;
    email: string;
    attendanceRate: string;
  }>;
  trends: Array<{
    date: string;
    total_records: number;
    present_count: number;
    absent_count: number;
    late_count: number;
  }>;
  period?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CalendarData {
  period: {
    startDate: string;
    endDate: string;
  };
  records: AttendanceRecord[];
}

export interface UploadResponse {
  message: string;
  uploadId: number;
  processedCount: number;
  errorCount: number;
  duplicatesCount?: number;
  createdUsersCount?: number;
  errors?: string[];
  summary?: {
    totalRecords: number;
    newRecords: number;
    duplicateRecords: number;
    errorRecords: number;
    createdUsers: number;
  };
}

export interface AttendanceSetting {
  id: number;
  setting_name: string;
  setting_value: string;
  description: string;
  setting_type: 'text' | 'number' | 'boolean' | 'time' | 'json';
  updated_by?: number;
  updated_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  recurring_type?: 'annual' | 'monthly' | 'weekly';
  description?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSchedule {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[]; // Array of day numbers: 1=Monday, 7=Sunday
  is_default: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSettingsData {
  settings: AttendanceSetting[];
  holidays: Holiday[];
  workSchedules: WorkSchedule[];
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  name: string;
  locationId: number;
  description?: string;
  managerId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  location?: Location;
  manager?: User;
}

export interface AttendanceRule {
  id: number;
  ruleName: string;
  ruleType: 'global' | 'location' | 'team';
  targetId?: number;
  ruleKey: string;
  ruleValue: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  target?: Location | Team; // The associated location or team
}

export interface TeamSchedule {
  id: number;
  teamId: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationHoliday {
  id: number;
  locationId: number;
  holidayName: string;
  holidayDate: string;
  isRecurring: boolean;
  createdAt: string;
  location?: Location;
}

// Role Management Types
export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface HierarchyLevel {
  id: number;
  name: string;
  level: number;
  description: string;
  permissions: string[];
  canManage: string[];
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}
