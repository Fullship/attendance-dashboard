import React, { useState, useEffect } from 'react';
import { adminAPI, handleApiError } from '../utils/api';
import { Team, Employee } from '../types';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface TeamManagerProps {
  onTeamChange?: () => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ onTeamChange }) => {
  const [teams, setTeams] = useState<(Team & { employeeCount: number })[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [employeesResponse] = await Promise.all([
        adminAPI.getEmployees({ limit: 1000 }), // Get all employees for manager selection
      ]);

      setEmployees(employeesResponse.employees);
      await fetchTeams();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await adminAPI.getTeams();
      setTeams(response.teams);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const teamData = {
        name: formData.name,
        description: formData.description || undefined,
        managerId: formData.managerId ? Number(formData.managerId) : undefined,
      };

      if (editingTeam) {
        await adminAPI.updateTeam(editingTeam.id, {
          ...teamData,
          isActive: editingTeam.isActive,
        });
        toast.success('Team updated successfully');
      } else {
        await adminAPI.createTeam(teamData);
        toast.success('Team created successfully');
      }

      resetForm();
      fetchTeams();
      onTeamChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      managerId: team.managerId?.toString() || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`Are you sure you want to delete team "${team.name}"?`)) {
      return;
    }

    try {
      await adminAPI.deleteTeam(team.id);
      toast.success('Team deleted successfully');
      fetchTeams();
      onTeamChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleToggleStatus = async (team: Team) => {
    try {
      await adminAPI.updateTeam(team.id, {
        name: team.name,
        locationId: team.locationId,
        description: team.description,
        managerId: team.managerId,
        isActive: !team.isActive,
      });
      toast.success(`Team ${team.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchTeams();
      onTeamChange?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', managerId: '' });
    setEditingTeam(null);
    setShowCreateForm(false);
  };

  const getManagerName = (managerId?: number) => {
    if (!managerId) return 'No Manager';
    const manager = employees.find(e => e.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown Manager';
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teams Management</h3>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          Add Team
        </Button>
      </div>

      {showCreateForm && (
        <Card title={editingTeam ? 'Edit Team' : 'Create New Team'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Manager
              </label>
              <select
                value={formData.managerId}
                onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">No Manager</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ({employee.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex space-x-3">
              <Button type="submit">{editingTeam ? 'Update' : 'Create'} Team</Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <Card key={team.id}>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{team.name}</h4>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    team.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {team.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {team.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{team.description}</p>
              )}

              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>Manager: {getManagerName(team.managerId)}</div>
                <div>Members: {team.employeeCount} employees</div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(team)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleStatus(team)}>
                  {team.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {team.employeeCount === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(team)}
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

      {teams.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              No teams found. Create your first team to get started.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamManager;
