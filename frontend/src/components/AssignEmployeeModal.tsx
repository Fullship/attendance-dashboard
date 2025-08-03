import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Employee, Location, Team } from '../types';
import { adminAPI, handleApiError } from '../utils/api';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface AssignEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEmployeeUpdated: () => void;
}

const AssignEmployeeModal: React.FC<AssignEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>();

  useEffect(() => {
    if (isOpen && employee) {
      setSelectedLocationId(employee.locationId || undefined);
      setSelectedTeamId(employee.teamId || undefined);
      fetchLocationsAndTeams();
    }
  }, [isOpen, employee]);

  const fetchLocationsAndTeams = async () => {
    try {
      setLoading(true);
      const [locationsResponse, teamsResponse] = await Promise.all([
        adminAPI.getLocations(),
        adminAPI.getTeams(),
      ]);
      setLocations(locationsResponse.locations);
      setTeams(teamsResponse.teams);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      setSubmitting(true);

      // Prepare assignment data, filtering out undefined values
      const assignmentData: { locationId?: number; teamId?: number } = {};
      if (selectedLocationId !== undefined) {
        assignmentData.locationId = selectedLocationId;
      }
      if (selectedTeamId !== undefined) {
        assignmentData.teamId = selectedTeamId;
      }

      await adminAPI.updateEmployeeAssignment(employee.id, assignmentData);

      toast.success('Employee assignment updated successfully');
      onEmployeeUpdated();
      onClose();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedLocationId(undefined);
    setSelectedTeamId(undefined);
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assign Employee to Location & Team
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {employee.firstName} {employee.lastName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <select
                  value={selectedLocationId || ''}
                  onChange={e =>
                    setSelectedLocationId(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current: {employee.location?.name || 'No Location'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team
                </label>
                <select
                  value={selectedTeamId || ''}
                  onChange={e =>
                    setSelectedTeamId(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current: {employee.team?.name || 'No Team'}
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Updating...' : 'Update Assignment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignEmployeeModal;
