import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { adminAPI, handleApiError } from '../utils/api';
import {
  AttendanceSettingsData,
  AttendanceSetting,
  Holiday,
  WorkSchedule,
  AttendanceRule,
  Location,
  Team,
} from '../types';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

// Attendance Rule Form Component
interface AttendanceRuleFormProps {
  rule?: AttendanceRule;
  ruleType: 'global' | 'location' | 'team';
  targetId?: number;
  onSave: (data: {
    ruleName: string;
    ruleKey: string;
    ruleValue: string;
    description?: string;
    isActive?: boolean;
  }) => void;
  onCancel: () => void;
}

const AttendanceRuleForm: React.FC<AttendanceRuleFormProps> = ({
  rule,
  ruleType,
  targetId,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    ruleName: rule?.ruleName || '',
    ruleKey: rule?.ruleKey || '',
    ruleValue: rule?.ruleValue || '',
    description: rule?.description || '',
    isActive: rule?.isActive !== undefined ? rule.isActive : true,
  });

  const commonRuleKeys = [
    'late_threshold_minutes',
    'early_departure_threshold_minutes',
    'grace_period_minutes',
    'minimum_work_hours',
    'overtime_threshold_hours',
    'overtime_pay_multiplier',
    'holiday_pay_multiplier',
    'max_retroactive_days',
    'automatic_break_deduction_minutes',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ruleName.trim() || !formData.ruleKey.trim() || !formData.ruleValue.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
          {rule ? 'Edit' : 'Add'} Attendance Rule
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={formData.ruleName}
              onChange={e => setFormData({ ...formData, ruleName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              placeholder="e.g., Late Arrival Penalty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rule Key *
            </label>
            <select
              value={formData.ruleKey}
              onChange={e => setFormData({ ...formData, ruleKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select a rule key</option>
              {commonRuleKeys.map(key => (
                <option key={key} value={key}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Or type a custom rule key above</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rule Value *
            </label>
            <input
              type="text"
              value={formData.ruleValue}
              onChange={e => setFormData({ ...formData, ruleValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              placeholder="e.g., 15, true, false"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Optional description for this rule"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Rule is Active
            </label>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="submit">{rule ? 'Update' : 'Create'} Rule</Button>
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AttendanceSettings: React.FC = () => {
  const [data, setData] = useState<AttendanceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState<{ [key: string]: string }>({});
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);

  // New state for attendance rules
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeRuleTab, setActiveRuleTab] = useState<'global' | 'location' | 'team'>('global');
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AttendanceRule | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchLocationsAndTeams();
    fetchAttendanceRules();
  }, []);

  // Fetch attendance rules when tab or selection changes
  useEffect(() => {
    fetchAttendanceRules();
  }, [activeRuleTab, selectedLocationId, selectedTeamId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      setData(response);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsAndTeams = async () => {
    try {
      const [locationsResponse, teamsResponse] = await Promise.all([
        adminAPI.getLocations(),
        adminAPI.getTeams(),
      ]);
      setLocations(locationsResponse.locations);
      setTeams(teamsResponse.teams);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const fetchAttendanceRules = async () => {
    try {
      let ruleType = activeRuleTab;
      let targetId: number | undefined;

      if (activeRuleTab === 'location' && selectedLocationId) {
        targetId = selectedLocationId;
      } else if (activeRuleTab === 'team' && selectedTeamId) {
        targetId = selectedTeamId;
      }

      const response = await adminAPI.getAttendanceRules(ruleType, targetId);
      setAttendanceRules(response.rules);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleSettingEdit = (settingName: string, currentValue: string) => {
    setEditingSettings({ ...editingSettings, [settingName]: currentValue });
  };

  const handleSettingSave = async (settingName: string) => {
    try {
      const newValue = editingSettings[settingName];
      if (newValue === undefined) return;

      await adminAPI.updateSetting(settingName, newValue);
      toast.success('Setting updated successfully');

      // Update local data
      if (data) {
        const updatedSettings = data.settings.map(setting =>
          setting.setting_name === settingName ? { ...setting, setting_value: newValue } : setting
        );
        setData({ ...data, settings: updatedSettings });
      }

      // Clear editing state
      const newEditingSettings = { ...editingSettings };
      delete newEditingSettings[settingName];
      setEditingSettings(newEditingSettings);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleSettingCancel = (settingName: string) => {
    const newEditingSettings = { ...editingSettings };
    delete newEditingSettings[settingName];
    setEditingSettings(newEditingSettings);
  };

  // Attendance Rule Management Functions
  const handleCreateRule = async (ruleData: {
    ruleName: string;
    ruleKey: string;
    ruleValue: string;
    description?: string;
  }) => {
    try {
      let targetId: number | undefined;
      if (activeRuleTab === 'location' && selectedLocationId) {
        targetId = selectedLocationId;
      } else if (activeRuleTab === 'team' && selectedTeamId) {
        targetId = selectedTeamId;
      }

      await adminAPI.createAttendanceRule({
        ...ruleData,
        ruleType: activeRuleTab,
        targetId,
      });

      toast.success('Attendance rule created successfully');
      fetchAttendanceRules();
      setShowRuleForm(false);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleUpdateRule = async (
    ruleId: number,
    ruleData: {
      ruleName: string;
      ruleValue: string;
      description?: string;
      isActive: boolean;
    }
  ) => {
    try {
      await adminAPI.updateAttendanceRule(ruleId, ruleData);
      toast.success('Attendance rule updated successfully');
      fetchAttendanceRules();
      setEditingRule(null);
      setShowRuleForm(false);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await adminAPI.deleteAttendanceRule(ruleId);
      toast.success('Attendance rule deleted successfully');
      fetchAttendanceRules();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  // Group settings by category for better organization
  const settingsCategories = {
    'Time & Schedule': {
      icon: ClockIcon,
      settings: [
        'late_threshold_minutes',
        'early_departure_threshold_minutes',
        'grace_period_minutes',
        'minimum_work_hours',
        'automatic_break_deduction_minutes',
      ],
    },
    'Overtime & Hours': {
      icon: Cog6ToothIcon,
      settings: [
        'overtime_threshold_hours',
        'require_admin_approval_for_overtime',
        'weekend_work_allowed',
      ],
    },
    'Pay & Benefits': {
      icon: CurrencyDollarIcon,
      settings: ['overtime_pay_multiplier', 'holiday_pay_multiplier'],
    },
    'Employee Requests': {
      icon: ShieldCheckIcon,
      settings: ['allow_retroactive_requests', 'max_retroactive_days'],
    },
  };

  const renderSettingsSection = (categoryName: string, categoryConfig: any) => {
    const categorySettings =
      data?.settings.filter(setting => categoryConfig.settings.includes(setting.setting_name)) ||
      [];

    if (categorySettings.length === 0) return null;

    const IconComponent = categoryConfig.icon;

    return (
      <Card key={categoryName} className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <IconComponent className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{categoryName}</h3>
        </div>
        <div className="space-y-3">
          {categorySettings.map(setting => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {setting.setting_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {setting.description}
                </div>
              </div>
              <div className="flex-shrink-0">{renderSettingValue(setting)}</div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderSettingValue = (setting: AttendanceSetting) => {
    const isEditing = editingSettings[setting.setting_name] !== undefined;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          {setting.setting_type === 'boolean' ? (
            <select
              value={editingSettings[setting.setting_name]}
              onChange={e =>
                setEditingSettings({
                  ...editingSettings,
                  [setting.setting_name]: e.target.value,
                })
              }
              className="px-2 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type={setting.setting_type === 'number' ? 'number' : 'text'}
              value={editingSettings[setting.setting_name]}
              onChange={e =>
                setEditingSettings({
                  ...editingSettings,
                  [setting.setting_name]: e.target.value,
                })
              }
              className="px-2 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          )}
          <Button size="sm" onClick={() => handleSettingSave(setting.setting_name)}>
            <CheckIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSettingCancel(setting.setting_name)}
          >
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <span className="text-gray-900 dark:text-white">
          {setting.setting_type === 'boolean'
            ? setting.setting_value === 'true'
              ? 'Yes'
              : 'No'
            : setting.setting_value}
          {setting.setting_type === 'number' && (
            <span className="text-gray-500 ml-1">
              {setting.setting_name.includes('minutes')
                ? 'min'
                : setting.setting_name.includes('hours')
                ? 'hrs'
                : setting.setting_name.includes('days')
                ? 'days'
                : ''}
            </span>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSettingEdit(setting.setting_name, setting.setting_value)}
        >
          <PencilIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const HolidayForm: React.FC<{
    holiday?: Holiday;
    onSave: (holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
    onCancel: () => void;
  }> = ({ holiday, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      name: holiday?.name || '',
      date: holiday?.date || '',
      is_recurring: holiday?.is_recurring || false,
      recurring_type: holiday?.recurring_type || 'annual',
      description: holiday?.description || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Holiday Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_recurring"
            checked={formData.is_recurring}
            onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="mr-2"
          />
          <label
            htmlFor="is_recurring"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Recurring Holiday
          </label>
        </div>
        {formData.is_recurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Recurrence Type
            </label>
            <select
              value={formData.recurring_type}
              onChange={e =>
                setFormData({
                  ...formData,
                  recurring_type: e.target.value as 'annual' | 'monthly' | 'weekly',
                })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="flex space-x-2">
          <Button type="submit">{holiday ? 'Update' : 'Add'} Holiday</Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  const handleHolidaySubmit = async (
    holidayData: Omit<Holiday, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) => {
    try {
      if (editingHoliday) {
        await adminAPI.updateHoliday(editingHoliday.id, holidayData);
        toast.success('Holiday updated successfully');
      } else {
        await adminAPI.addHoliday(holidayData);
        toast.success('Holiday added successfully');
      }
      await fetchSettings();
      setShowHolidayForm(false);
      setEditingHoliday(null);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await adminAPI.deleteHoliday(id);
      toast.success('Holiday deleted successfully');
      await fetchSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const WorkScheduleForm: React.FC<{
    schedule?: WorkSchedule;
    onSave: (
      schedule: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at' | 'created_by'>
    ) => void;
    onCancel: () => void;
  }> = ({ schedule, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      name: schedule?.name || '',
      start_time: schedule?.start_time?.substring(0, 5) || '09:00', // Convert HH:MM:SS to HH:MM
      end_time: schedule?.end_time?.substring(0, 5) || '17:00', // Convert HH:MM:SS to HH:MM
      days_of_week: schedule?.days_of_week || [1, 2, 3, 4, 5], // Monday to Friday by default
      is_default: schedule?.is_default || false,
    });

    const dayOptions = [
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' },
      { value: 7, label: 'Sunday' },
    ];

    const handleDayToggle = (dayValue: number) => {
      const newDays = formData.days_of_week.includes(dayValue)
        ? formData.days_of_week.filter(day => day !== dayValue)
        : [...formData.days_of_week, dayValue].sort();
      setFormData({ ...formData, days_of_week: newDays });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.days_of_week.length === 0) {
        toast.error('Please select at least one working day');
        return;
      }

      // Convert time format from HH:MM to HH:MM:SS for database
      const scheduleData = {
        name: formData.name,
        start_time: formData.start_time + ':00',
        end_time: formData.end_time + ':00',
        days_of_week: formData.days_of_week,
        is_default: formData.is_default,
      };

      onSave(scheduleData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder="e.g., Standard Hours, Part-time, Night Shift"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Time
            </label>
            <input
              type="time"
              required
              value={formData.start_time}
              onChange={e => setFormData({ ...formData, start_time: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Time
            </label>
            <input
              type="time"
              required
              value={formData.end_time}
              onChange={e => setFormData({ ...formData, end_time: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Working Days
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dayOptions.map(day => (
              <label key={day.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.days_of_week.includes(day.value)}
                  onChange={() => handleDayToggle(day.value)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_default"
            checked={formData.is_default}
            onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
            className="mr-2"
          />
          <label
            htmlFor="is_default"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Set as Default Schedule
          </label>
        </div>

        <div className="flex space-x-2">
          <Button type="submit">{schedule ? 'Update' : 'Add'} Schedule</Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  };

  const handleScheduleSubmit = async (
    scheduleData: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) => {
    try {
      if (editingSchedule) {
        await adminAPI.updateWorkSchedule(editingSchedule.id, scheduleData);
        toast.success('Work schedule updated successfully');
      } else {
        await adminAPI.addWorkSchedule(scheduleData);
        toast.success('Work schedule added successfully');
      }
      await fetchSettings();
      setShowScheduleForm(false);
      setEditingSchedule(null);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this work schedule?')) return;

    try {
      await adminAPI.deleteWorkSchedule(id);
      toast.success('Work schedule deleted successfully');
      await fetchSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return <div>No settings data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Settings</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure attendance rules, holidays, and work schedules for your organization.
        </p>
      </div>

      {/* Attendance Rules - Categorized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(settingsCategories).map(([categoryName, categoryConfig]) =>
          renderSettingsSection(categoryName, categoryConfig)
        )}
      </div>

      {/* New Attendance Rules Section */}
      <Card className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Advanced Attendance Rules
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and manage attendance rules by global, location, and team levels
              </p>
            </div>
          </div>
        </div>

        {/* Rule Type Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveRuleTab('global')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeRuleTab === 'global'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <GlobeAltIcon className="w-4 h-4" />
              <span>Global Rules</span>
            </button>
            <button
              onClick={() => setActiveRuleTab('location')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeRuleTab === 'location'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BuildingOfficeIcon className="w-4 h-4" />
              <span>Location Rules</span>
            </button>
            <button
              onClick={() => setActiveRuleTab('team')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeRuleTab === 'team'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>Team Rules</span>
            </button>
          </nav>
        </div>

        {/* Location/Team Selector */}
        {(activeRuleTab === 'location' || activeRuleTab === 'team') && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select {activeRuleTab === 'location' ? 'Location' : 'Team'}:
              </label>
              <select
                value={
                  activeRuleTab === 'location' ? selectedLocationId || '' : selectedTeamId || ''
                }
                onChange={e => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  if (activeRuleTab === 'location') {
                    setSelectedLocationId(value);
                  } else {
                    setSelectedTeamId(value);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                <option value="">
                  Select {activeRuleTab === 'location' ? 'a location' : 'a team'}
                </option>
                {(activeRuleTab === 'location' ? locations : teams).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Add Rule Button */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              {activeRuleTab === 'global'
                ? 'Global Rules'
                : activeRuleTab === 'location'
                ? `Rules for ${
                    locations.find(l => l.id === selectedLocationId)?.name || 'Selected Location'
                  }`
                : `Rules for ${teams.find(t => t.id === selectedTeamId)?.name || 'Selected Team'}`}
            </h4>
          </div>
          <Button
            onClick={() => setShowRuleForm(true)}
            disabled={
              activeRuleTab !== 'global' &&
              ((activeRuleTab === 'location' && !selectedLocationId) ||
                (activeRuleTab === 'team' && !selectedTeamId))
            }
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {attendanceRules.map(rule => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{rule.ruleName}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {rule.ruleType}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {rule.ruleKey}: {rule.ruleValue}
                </p>
                {rule.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {rule.description}
                  </p>
                )}
                {rule.ruleType !== 'global' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Target:{' '}
                    {rule.ruleType === 'location'
                      ? locations.find(l => l.id === rule.targetId)?.name
                      : teams.find(t => t.id === rule.targetId)?.name}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingRule(rule);
                    setShowRuleForm(true);
                  }}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {attendanceRules.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No rules found for this {activeRuleTab} level.
            </div>
          )}
        </div>

        {/* Rule Form Modal */}
        {showRuleForm && (
          <AttendanceRuleForm
            rule={editingRule || undefined}
            ruleType={activeRuleTab}
            targetId={
              activeRuleTab === 'location'
                ? selectedLocationId || undefined
                : activeRuleTab === 'team'
                ? selectedTeamId || undefined
                : undefined
            }
            onSave={
              editingRule
                ? data =>
                    handleUpdateRule(editingRule.id, {
                      ...data,
                      isActive: data.isActive ?? true,
                    })
                : handleCreateRule
            }
            onCancel={() => {
              setShowRuleForm(false);
              setEditingRule(null);
            }}
          />
        )}
      </Card>

      {/* Holidays */}
      <Card className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Company Holidays
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage company holidays that won't count as absent days
              </p>
            </div>
          </div>
          <Button onClick={() => setShowHolidayForm(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Holiday
          </Button>
        </div>
        {showHolidayForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium mb-4">
              {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
            </h3>
            <HolidayForm
              holiday={editingHoliday || undefined}
              onSave={handleHolidaySubmit}
              onCancel={() => {
                setShowHolidayForm(false);
                setEditingHoliday(null);
              }}
            />
          </div>
        )}

        <div className="grid gap-3">
          {data.holidays.map(holiday => (
            <div
              key={holiday.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                  {holiday.is_recurring && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {holiday.recurring_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  📅{' '}
                  {new Date(holiday.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {holiday.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {holiday.description}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingHoliday(holiday);
                    setShowHolidayForm(true);
                  }}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Work Schedules */}
      <Card className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Work Schedules
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Define standard work hours and days for different schedules
              </p>
            </div>
          </div>
          <Button onClick={() => setShowScheduleForm(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </div>

        {showScheduleForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h3>
            <WorkScheduleForm
              schedule={editingSchedule || undefined}
              onSave={handleScheduleSubmit}
              onCancel={() => {
                setShowScheduleForm(false);
                setEditingSchedule(null);
              }}
            />
          </div>
        )}

        <div className="grid gap-3">
          {data.workSchedules.map(schedule => {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const workDays = schedule.days_of_week
              .map(day => dayNames[day === 7 ? 0 : day])
              .join(', ');

            return (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{schedule.name}</h4>
                    {schedule.is_default && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    🕐 {schedule.start_time} - {schedule.end_time}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📅 {workDays}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSchedule(schedule);
                      setShowScheduleForm(true);
                    }}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  {!schedule.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default AttendanceSettings;
