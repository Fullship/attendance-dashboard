import React, { useState, useEffect } from 'react';
import { adminAPI, handleApiError } from '../utils/api';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface AttendanceSetting {
  id: number;
  setting_name: string;
  setting_value: string;
  description: string;
  updated_at: string;
  updated_by?: number;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  recurring_type?: string;
  description: string;
  created_by: number;
}

interface WorkSchedule {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_default: boolean;
  description?: string;
  created_by: number;
}

interface Location {
  id: number;
  name: string;
  address: string;
  timezone: string;
  isActive: boolean;
  employeeCount: number;
  teamCount: number;
}

interface Team {
  id: number;
  name: string;
  locationId: number;
  description: string;
  managerId: number;
  isActive: boolean;
  location?: {
    name: string;
    timezone: string;
  };
  manager?: {
    firstName: string;
    lastName: string;
  };
  employeeCount: number;
}

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'holidays' | 'schedules' | 'locations' | 'teams'>('general');
  const [loading, setLoading] = useState(true);
  
  // General settings state
  const [settings, setSettings] = useState<AttendanceSetting[]>([]);
  
  // Holidays state
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    isRecurring: false,
    recurringType: 'yearly',
    description: ''
  });
  
  // Work schedules state
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    isDefault: false,
    description: ''
  });
  
  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    timezone: 'UTC'
  });
  
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeam, setNewTeam] = useState({
    name: '',
    locationId: '',
    description: '',
    managerId: ''
  });

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      console.log('AdminSettings: getSettings response', response);
      setSettings(Array.isArray(response.settings) ? response.settings : []);
      const holidaysArr = Array.isArray(response.holidays) ? response.holidays : [];
      setHolidays(
        holidaysArr.map((h: any) => ({
          ...h,
          description: h.description ?? '',
          is_recurring: h.is_recurring ?? false,
          recurring_type: h.recurring_type ?? '',
          created_by: h.created_by ?? 0,
        }))
      );
      const workSchedulesArr = Array.isArray(response.workSchedules) ? response.workSchedules : [];
      setWorkSchedules(
        workSchedulesArr.map((ws: any) => ({
          ...ws,
          description: ws.description ?? '',
          created_by: ws.created_by ?? 0,
          start_time: ws.start_time ?? ws.startTime ?? '',
          end_time: ws.end_time ?? ws.endTime ?? '',
          days_of_week: ws.days_of_week ?? ws.daysOfWeek ?? [],
          is_default: ws.is_default ?? ws.isDefault ?? false,
        }))
      );
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await adminAPI.getLocations();
      setLocations(
        (response.locations || []).map((loc: any) => ({
          ...loc,
          address: loc.address ?? '',
          employeeCount: loc.employeeCount ?? 0,
          teamCount: loc.teamCount ?? 0,
        }))
      );
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await adminAPI.getTeams();
      setTeams(
        (response.teams || []).map((team: any) => ({
          ...team,
          description: team.description ?? '',
        }))
      );
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  useEffect(() => {
    if (activeTab === 'locations') {
      fetchLocations();
    } else if (activeTab === 'teams') {
      fetchTeams();
    }
  }, [activeTab]);

  const handleUpdateSetting = async (settingName: string, value: string) => {
    try {
      await adminAPI.updateSetting(settingName, value);
      toast.success('Setting updated successfully');
      fetchAllSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Transform to API type
      // Only allow allowed values for recurring_type
      const allowedRecurringTypes = ['annual', 'monthly', 'weekly'];
      await adminAPI.addHoliday({
        name: newHoliday.name,
        date: newHoliday.date,
        is_recurring: newHoliday.isRecurring,
        recurring_type: allowedRecurringTypes.includes(newHoliday.recurringType) ? newHoliday.recurringType as 'annual' | 'monthly' | 'weekly' : undefined,
        description: newHoliday.description,
      });
      toast.success('Holiday added successfully');
      setNewHoliday({
        name: '',
        date: '',
        isRecurring: false,
        recurringType: 'yearly',
        description: ''
      });
      fetchAllSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      await adminAPI.deleteHoliday(id);
      toast.success('Holiday deleted successfully');
      fetchAllSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleAddWorkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Transform to API type
      await adminAPI.addWorkSchedule({
        name: newSchedule.name,
        start_time: newSchedule.startTime,
        end_time: newSchedule.endTime,
        days_of_week: newSchedule.daysOfWeek,
        is_default: newSchedule.isDefault,
        // description is not in API type, so omit it
      });
      toast.success('Work schedule added successfully');
      setNewSchedule({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        isDefault: false,
        description: ''
      });
      fetchAllSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleDeleteWorkSchedule = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this work schedule?')) return;
    
    try {
      await adminAPI.deleteWorkSchedule(id);
      toast.success('Work schedule deleted successfully');
      fetchAllSettings();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For now, show a placeholder message since the API endpoint may not be implemented
      toast.success('Location functionality coming soon!');
      console.log('Would add location:', newLocation);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For now, show a placeholder message since the API endpoint may not be implemented
      toast.success('Team functionality coming soon!');
      console.log('Would add team:', newTeam);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card title="General Attendance Settings" subtitle="Configure global attendance parameters">
        <div className="space-y-4">
          {settings.length > 0 ? (
            settings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {setting.setting_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{setting.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    defaultValue={setting.setting_value}
                    onBlur={(e) => {
                      if (e.target.value !== setting.setting_value) {
                        handleUpdateSetting(setting.setting_name, e.target.value);
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No settings configured yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderHolidays = () => (
    <div className="space-y-6">
      <Card title="Add New Holiday" subtitle="Configure company holidays">
        <form onSubmit={handleAddHoliday} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Holiday Name
              </label>
              <input
                type="text"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newHoliday.description}
              onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurring"
              checked={newHoliday.isRecurring}
              onChange={(e) => setNewHoliday({ ...newHoliday, isRecurring: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Recurring holiday
            </label>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            Add Holiday
          </button>
        </form>
      </Card>

      <Card title="Existing Holidays" subtitle="Manage company holidays">
        <div className="space-y-4">
          {holidays.length > 0 ? (
            holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{holiday.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(holiday.date).toLocaleDateString()} 
                    {holiday.is_recurring && ' (Recurring)'}
                  </p>
                  {holiday.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{holiday.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No holidays configured yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderWorkSchedules = () => (
    <div className="space-y-6">
      <Card title="Add Work Schedule" subtitle="Configure work schedules">
        <form onSubmit={handleAddWorkSchedule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Name
              </label>
              <input
                type="text"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={newSchedule.startTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={newSchedule.endTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newSchedule.description}
              onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={newSchedule.isDefault}
              onChange={(e) => setNewSchedule({ ...newSchedule, isDefault: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Set as default schedule
            </label>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            Add Schedule
          </button>
        </form>
      </Card>

      <Card title="Existing Work Schedules" subtitle="Manage work schedules">
        <div className="space-y-4">
          {workSchedules.length > 0 ? (
            workSchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {schedule.name} {schedule.is_default && '(Default)'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {schedule.start_time} - {schedule.end_time}
                  </p>
                  {schedule.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{schedule.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteWorkSchedule(schedule.id)}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors duration-200"
                  disabled={schedule.is_default}
                >
                  {schedule.is_default ? 'Default' : 'Delete'}
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No work schedules configured yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderLocations = () => (
    <div className="space-y-6">
      <Card title="Add Location" subtitle="Configure office locations">
        <form onSubmit={handleAddLocation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location Name
              </label>
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={newLocation.timezone}
                onChange={(e) => setNewLocation({ ...newLocation, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Asia/Dubai">Dubai</option>
                <option value="Asia/Baghdad">Baghdad</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <textarea
              value={newLocation.address}
              onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            Add Location
          </button>
        </form>
      </Card>

      <Card title="Existing Locations" subtitle="Manage office locations">
        <div className="space-y-4">
          {locations.length > 0 ? (
            locations.map((location) => (
              <div key={location.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{location.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {location.timezone} • {location.employeeCount} employees • {location.teamCount} teams
                  </p>
                  {location.address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{location.address}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  location.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No locations configured yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderTeams = () => (
    <div className="space-y-6">
      <Card title="Add Team" subtitle="Configure teams and departments">
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <select
                value={newTeam.locationId}
                onChange={(e) => setNewTeam({ ...newTeam, locationId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            Add Team
          </button>
        </form>
      </Card>

      <Card title="Existing Teams" subtitle="Manage teams and departments">
        <div className="space-y-4">
          {teams.length > 0 ? (
            teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {team.location?.name || 'No location'} • {team.employeeCount} employees
                  </p>
                  {team.manager && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manager: {team.manager.firstName} {team.manager.lastName}
                    </p>
                  )}
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  team.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {team.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No teams configured yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure system settings, holidays, work schedules, locations, and teams
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'General Settings' },
            { id: 'holidays', label: 'Holidays' },
            { id: 'schedules', label: 'Work Schedules' },
            { id: 'locations', label: 'Locations' },
            { id: 'teams', label: 'Teams' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'holidays' && renderHolidays()}
        {activeTab === 'schedules' && renderWorkSchedules()}
        {activeTab === 'locations' && renderLocations()}
        {activeTab === 'teams' && renderTeams()}
      </div>
    </div>
  );
};

export default AdminSettings;
