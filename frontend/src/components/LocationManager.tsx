import React, { useState, useEffect } from 'react';
import { adminAPI, handleApiError } from '../utils/api';
import { Location } from '../types';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface LocationManagerProps {
  onLocationChange?: () => void;
}

const LocationManager: React.FC<LocationManagerProps> = ({ onLocationChange }) => {
  const [locations, setLocations] = useState<(Location & { employeeCount: number; teamCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timezone: 'UTC'
  });

  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Global' },
    
    // North America
    { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
    
    // Europe
    { value: 'Europe/London', label: 'Greenwich Mean Time (London)', region: 'Europe' },
    { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
    
    // Asia Pacific
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia Pacific' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', region: 'Asia Pacific' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Asia Pacific' },
    
    // Middle East & Gulf
    { value: 'Asia/Baghdad', label: 'Baghdad Time (Iraq)', region: 'Middle East' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (UAE)', region: 'Middle East' },
    { value: 'Asia/Kuwait', label: 'Arabian Standard Time (Kuwait)', region: 'Middle East' },
    { value: 'Asia/Riyadh', label: 'Arabian Standard Time (Saudi Arabia)', region: 'Middle East' },
    { value: 'Asia/Qatar', label: 'Arabian Standard Time (Qatar)', region: 'Middle East' },
    { value: 'Asia/Bahrain', label: 'Arabian Standard Time (Bahrain)', region: 'Middle East' },
    { value: 'Asia/Muscat', label: 'Gulf Standard Time (Oman)', region: 'Middle East' },
    { value: 'Asia/Doha', label: 'Arabian Standard Time (Qatar)', region: 'Middle East' },
    { value: 'Asia/Tehran', label: 'Iran Standard Time (Iran)', region: 'Middle East' },
    { value: 'Asia/Istanbul', label: 'Turkey Time (Turkey)', region: 'Middle East' },
    { value: 'Asia/Jerusalem', label: 'Israel Standard Time (Israel)', region: 'Middle East' },
    { value: 'Asia/Beirut', label: 'Eastern European Time (Lebanon)', region: 'Middle East' },
    { value: 'Asia/Damascus', label: 'Eastern European Time (Syria)', region: 'Middle East' },
    { value: 'Asia/Amman', label: 'Eastern European Time (Jordan)', region: 'Middle East' },
    { value: 'Africa/Cairo', label: 'Eastern European Time (Egypt)', region: 'Middle East' },
    { value: 'Asia/Aden', label: 'Arabian Standard Time (Yemen)', region: 'Middle East' }
  ];

  // Helper function to get timezone label
  const getTimezoneLabel = (timezoneValue: string) => {
    const timezone = timezones.find(tz => tz.value === timezoneValue);
    return timezone ? timezone.label : timezoneValue;
  };

  // Helper function to get current time in timezone
  const getCurrentTimeInTimezone = (timezoneValue: string) => {
    try {
      return new Date().toLocaleString('en-US', {
        timeZone: timezoneValue,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getLocations();
      setLocations(response.locations);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLocation) {
        await adminAPI.updateLocation(editingLocation.id, {
          ...formData,
          isActive: editingLocation.isActive
        });
        toast.success('Location updated successfully');
      } else {
        await adminAPI.createLocation(formData);
        toast.success('Location created successfully');
      }
      
      resetForm();
      fetchLocations();
      onLocationChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      timezone: location.timezone
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (location: Location) => {
    if (!window.confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return;
    }

    try {
      await adminAPI.deleteLocation(location.id);
      toast.success('Location deleted successfully');
      fetchLocations();
      onLocationChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleToggleStatus = async (location: Location) => {
    try {
      await adminAPI.updateLocation(location.id, {
        name: location.name,
        address: location.address,
        timezone: location.timezone,
        isActive: !location.isActive
      });
      toast.success(`Location ${location.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchLocations();
      onLocationChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', timezone: 'UTC' });
    setEditingLocation(null);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Locations Management
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          Add Location
        </Button>
      </div>

      {showCreateForm && (
        <Card title={editingLocation ? 'Edit Location' : 'Create New Location'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone *
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {/* Group timezones by region */}
                {['Global', 'Middle East', 'North America', 'Europe', 'Asia Pacific'].map(region => (
                  <optgroup key={region} label={region}>
                    {timezones
                      .filter(tz => tz.region === region)
                      .map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))
                    }
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <Button type="submit">
                {editingLocation ? 'Update' : 'Create'} Location
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => (
          <Card key={location.id}>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {location.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🌍 {getTimezoneLabel(location.timezone)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    🕐 {getCurrentTimeInTimezone(location.timezone)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  location.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {location.address && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {location.address}
                </p>
              )}

              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{location.employeeCount} employees</span>
                <span>{location.teamCount} teams</span>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(location)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(location)}
                >
                  {location.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {location.employeeCount === 0 && location.teamCount === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(location)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {locations.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              No locations found. Create your first location to get started.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LocationManager;
