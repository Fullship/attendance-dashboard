/**
 * @file AttendanceDataManagement.tsx
 * @description Advanced attendance data management component for external API integration
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  Zap,
  Settings,
  Download,
  Trash2,
  Eye,
  Activity
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Types
interface AttendanceDataSource {
  data_source: string;
  total_records: number;
  unique_users: number;
  earliest_date: string;
  latest_date: string;
  last_sync: string;
}

interface SyncActivity {
  data_source: string;
  sync_date: string;
  records_synced: number;
}

interface AttendanceConflict {
  user_id: number;
  date: string;
  first_name: string;
  last_name: string;
  record_count: number;
  sources: string[];
  clock_in_times: string[];
  clock_out_times: string[];
}

interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    record: any;
    error: string;
  }>;
}

const AttendanceDataManagement: React.FC = () => {
  const [dataSources, setDataSources] = useState<AttendanceDataSource[]>([]);
  const [recentSyncs, setRecentSyncs] = useState<SyncActivity[]>([]);
  const [conflicts, setConflicts] = useState<AttendanceConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'conflicts' | 'real-time' | 'external-api'>('overview');
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null);
  
  // Real-time sync form
  const [realTimeData, setRealTimeData] = useState({
    user_id: '',
    event_type: 'clock_in' as 'clock_in' | 'clock_out',
    timestamp: '',
    location: ''
  });

  // Bulk sync form
  const [bulkSyncData, setBulkSyncData] = useState({
    api_url: '',
    date_range: {
      start_date: '',
      end_date: ''
    },
    authentication: {
      api_key: '',
      username: '',
      password: ''
    }
  });

  // External API state
  const [externalAPIStatus, setExternalAPIStatus] = useState<any>(null);
  const [externalAPITesting, setExternalAPITesting] = useState(false);
  const [externalEvents, setExternalEvents] = useState<any[]>([]);
  const [externalAPIForm, setExternalAPIForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    timezone: '+03:00',
    maxResults: 240,
    dryRun: true
  });
  
  // External API credentials state
  const [credentialsForm, setCredentialsForm] = useState({
    username: '',
    password: ''
  });
  const [credentialsStatus, setCredentialsStatus] = useState<any>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [sourcesResponse, conflictsResponse] = await Promise.all([
        api.get('/attendance-api/sources'),
        api.get('/attendance-api/conflicts')
      ]);
      
      if (sourcesResponse.data.success) {
        setDataSources(sourcesResponse.data.data.sources);
        setRecentSyncs(sourcesResponse.data.data.recent_syncs);
      }
      
      if (conflictsResponse.data.success) {
        setConflicts(conflictsResponse.data.data.conflicts);
      }
      
    } catch (error) {
      console.error('Failed to load attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeSync = async () => {
    try {
      setSyncLoading(true);
      
      const response = await api.post('/attendance-api/real-time', realTimeData);
      
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        setRealTimeData({
          user_id: '',
          event_type: 'clock_in',
          timestamp: '',
          location: ''
        });
        await loadData();
      }
      
    } catch (error: any) {
      console.error('Real-time sync failed:', error);
      alert(`❌ Real-time sync failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleBulkSync = async (records: any[]) => {
    try {
      setSyncLoading(true);
      
      const response = await api.post('/attendance-api/sync', { records });
      
      if (response.data.success) {
        setSyncResults(response.data.results);
        await loadData();
      }
      
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      alert(`❌ Bulk sync failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncLoading(true);
      
      const response = await api.post('/attendance-api/manual-sync', bulkSyncData);
      
      if (response.data.success) {
        alert(`✅ Manual sync initiated: ${response.data.message}`);
        await loadData();
      }
      
    } catch (error: any) {
      console.error('Manual sync failed:', error);
      alert(`❌ Manual sync failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // External API functions
  const testExternalAPI = async () => {
    try {
      setExternalAPITesting(true);
      const response = await api.get('/admin/external-api/test');
      
      if (response.data.success) {
        setExternalAPIStatus(response.data.result);
        toast.success('External API connection successful!');
      } else {
        toast.error('External API connection failed');
      }
    } catch (error: any) {
      console.error('External API test failed:', error);
      toast.error(`External API test failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setExternalAPITesting(false);
    }
  };

  const fetchExternalEvents = async () => {
    try {
      setSyncLoading(true);
      
      const requestData = externalAPIForm.startDate && externalAPIForm.endDate 
        ? {
            startDate: externalAPIForm.startDate,
            endDate: externalAPIForm.endDate,
            timezone: externalAPIForm.timezone,
            maxResults: externalAPIForm.maxResults
          }
        : {
            date: externalAPIForm.date,
            timezone: externalAPIForm.timezone,
            maxResults: externalAPIForm.maxResults
          };
      
      const response = await api.post('/admin/external-api/fetch-events', requestData);
      
      if (response.data.success) {
        setExternalEvents(response.data.data.transformedEvents || []);
        toast.success(`Fetched ${response.data.data.summary.totalEvents} events from external API`);
      } else {
        toast.error('Failed to fetch external events');
      }
    } catch (error: any) {
      console.error('Failed to fetch external events:', error);
      toast.error(`Failed to fetch external events: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const syncExternalEvents = async () => {
    try {
      setSyncLoading(true);
      
      const requestData = {
        ...externalAPIForm,
        dryRun: externalAPIForm.dryRun
      };
      
      if (externalAPIForm.startDate && externalAPIForm.endDate) {
        requestData.startDate = externalAPIForm.startDate;
        requestData.endDate = externalAPIForm.endDate;
        // Remove date field when using date range
        const { date, ...dataWithoutDate } = requestData;
        Object.assign(requestData, dataWithoutDate);
      }
      
      const response = await api.post('/admin/external-api/sync-events', requestData);
      
      if (response.data.success) {
        setSyncResults(response.data.data.syncResults);
        const message = response.data.data.dryRun 
          ? `Dry run completed: ${response.data.data.syncResults.processed} events processed`
          : `Sync completed: ${response.data.data.syncResults.inserted} events inserted, ${response.data.data.syncResults.updated} updated`;
        toast.success(message);
        await loadData();
      } else {
        toast.error('External API sync failed');
      }
    } catch (error: any) {
      console.error('External API sync failed:', error);
      toast.error(`External API sync failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // External API credentials functions
  const loadCredentialsStatus = async () => {
    try {
      const response = await api.get('/admin/external-api/credentials');
      if (response.data.success) {
        setCredentialsStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load credentials status:', error);
    }
  };

  const saveCredentials = async () => {
    try {
      setCredentialsLoading(true);
      
      const response = await api.post('/admin/external-api/credentials', credentialsForm);
      
      if (response.data.success) {
        toast.success('External API credentials saved successfully!');
        await loadCredentialsStatus();
        setCredentialsForm({ username: '', password: '' });
      } else {
        toast.error('Failed to save credentials');
      }
    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      toast.error(`Failed to save credentials: ${error.response?.data?.message || error.message}`);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const clearCredentials = async () => {
    try {
      setCredentialsLoading(true);
      
      const response = await api.delete('/admin/external-api/credentials');
      
      if (response.data.success) {
        toast.success('External API credentials cleared successfully!');
        await loadCredentialsStatus();
      } else {
        toast.error('Failed to clear credentials');
      }
    } catch (error: any) {
      console.error('Failed to clear credentials:', error);
      toast.error(`Failed to clear credentials: ${error.response?.data?.message || error.message}`);
    } finally {
      setCredentialsLoading(false);
    }
  };

  // Load credentials status on component mount
  useEffect(() => {
    if (activeTab === 'external-api') {
      loadCredentialsStatus();
    }
  }, [activeTab]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Data Sources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dataSources.length}
              </p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total API Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dataSources.reduce((sum, source) => sum + source.total_records, 0).toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Data Conflicts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {conflicts.length}
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${conflicts.length > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.max(...dataSources.map(s => s.unique_users), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Data Sources
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Sync
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {dataSources.map((source, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Database className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {source.data_source}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {source.total_records.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {source.unique_users}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {source.earliest_date} - {source.latest_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(source.last_sync).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Sync Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Sync Activity
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {recentSyncs.slice(0, 10).map((sync, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {sync.data_source}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sync.sync_date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {sync.records_synced} records
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSyncTab = () => (
    <div className="space-y-6">
      {/* Manual Sync Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Manual API Sync
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure and trigger manual synchronization with external attendance APIs
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API URL
              </label>
              <input
                type="url"
                value={bulkSyncData.api_url}
                onChange={(e) => setBulkSyncData({...bulkSyncData, api_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://api.example.com/attendance"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={bulkSyncData.authentication.api_key}
                onChange={(e) => setBulkSyncData({
                  ...bulkSyncData, 
                  authentication: {...bulkSyncData.authentication, api_key: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter API key"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={bulkSyncData.date_range.start_date}
                onChange={(e) => setBulkSyncData({
                  ...bulkSyncData, 
                  date_range: {...bulkSyncData.date_range, start_date: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={bulkSyncData.date_range.end_date}
                onChange={(e) => setBulkSyncData({
                  ...bulkSyncData, 
                  date_range: {...bulkSyncData.date_range, end_date: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleManualSync}
              disabled={syncLoading || !bulkSyncData.api_url}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {syncLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{syncLoading ? 'Syncing...' : 'Start Manual Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Results */}
      {syncResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Last Sync Results
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {syncResults.created}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Created</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {syncResults.updated}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Updated</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {syncResults.skipped}
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Skipped</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {syncResults.errors.length}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">Errors</p>
              </div>
            </div>
            
            {syncResults.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Sync Errors:
                </h4>
                <div className="space-y-2">
                  {syncResults.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error.error}
                      </p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Record: {JSON.stringify(error.record)}
                      </p>
                    </div>
                  ))}
                  {syncResults.errors.length > 5 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ...and {syncResults.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderRealTimeTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Real-time Attendance Event
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Process individual clock-in/clock-out events in real-time
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={realTimeData.user_id}
                onChange={(e) => setRealTimeData({...realTimeData, user_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <select
                value={realTimeData.event_type}
                onChange={(e) => setRealTimeData({...realTimeData, event_type: e.target.value as 'clock_in' | 'clock_out'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="clock_in">Clock In</option>
                <option value="clock_out">Clock Out</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timestamp
              </label>
              <input
                type="datetime-local"
                value={realTimeData.timestamp}
                onChange={(e) => setRealTimeData({...realTimeData, timestamp: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={realTimeData.location}
                onChange={(e) => setRealTimeData({...realTimeData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Office, Remote, etc."
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleRealTimeSync}
              disabled={syncLoading || !realTimeData.user_id || !realTimeData.timestamp}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {syncLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{syncLoading ? 'Processing...' : 'Process Event'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConflictsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Data Conflicts ({conflicts.length})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Attendance records with conflicting data from multiple sources
          </p>
        </div>
        
        {conflicts.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Conflicts Found
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              All attendance data is consistent across sources
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Clock In Times
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Clock Out Times
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {conflicts.map((conflict, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {conflict.first_name} {conflict.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {conflict.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {conflict.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {conflict.sources.map((source, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded">
                            {source}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {conflict.clock_in_times.filter(time => time).join(', ') || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {conflict.clock_out_times.filter(time => time).join(', ') || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderExternalAPITab = () => (
    <div className="space-y-6">
      {/* External API Credentials Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            API Authentication
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure Digest Authentication credentials for the external access control API
          </p>
        </div>
        
        <div className="p-6">
          {/* Current Credentials Status */}
          {credentialsStatus && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Current Status: {credentialsStatus.hasCredentials ? 
                      <span className="text-green-600">✓ Configured</span> : 
                      <span className="text-red-600">✗ Not Configured</span>
                    }
                  </p>
                  {credentialsStatus.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Username: {credentialsStatus.username}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    API URL: {credentialsStatus.baseURL}
                  </p>
                </div>
                {credentialsStatus.hasCredentials && (
                  <button
                    onClick={clearCredentials}
                    disabled={credentialsLoading}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Credentials Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={credentialsForm.username}
                onChange={(e) => setCredentialsForm({ ...credentialsForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter API username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentialsForm.password}
                onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter API password"
              />
            </div>
          </div>

          <button
            onClick={saveCredentials}
            disabled={credentialsLoading || !credentialsForm.username || !credentialsForm.password}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {credentialsLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            <span>Save Credentials</span>
          </button>
        </div>
      </div>

      {/* External API Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            External Access Control API
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Integration with external access control system for clock-in/out events
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                API Connection Status
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Test connection to external access control system
              </p>
            </div>
            
            <button
              onClick={testExternalAPI}
              disabled={externalAPITesting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {externalAPITesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              <span>{externalAPITesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
          
          {externalAPIStatus && (
            <div className={`p-4 rounded-lg ${
              externalAPIStatus.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center">
                {externalAPIStatus.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                )}
                <span className={`font-medium ${
                  externalAPIStatus.success 
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {externalAPIStatus.message}
                </span>
              </div>
              {externalAPIStatus.hasData !== undefined && (
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  Data available: {externalAPIStatus.hasData ? 'Yes' : 'No'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fetch Events Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Fetch External Events
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Retrieve clock-in/out events from external access control system
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Single Date
              </label>
              <input
                type="date"
                value={externalAPIForm.date}
                onChange={(e) => setExternalAPIForm({ ...externalAPIForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={externalAPIForm.timezone}
                onChange={(e) => setExternalAPIForm({ ...externalAPIForm, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="+03:00">+03:00 (Kuwait/Iraq)</option>
                <option value="+00:00">+00:00 (UTC)</option>
                <option value="+02:00">+02:00 (Cairo)</option>
                <option value="+04:00">+04:00 (Dubai)</option>
              </select>
            </div>
          </div>
          
          <div className="text-center text-gray-500 dark:text-gray-400">
            OR
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={externalAPIForm.startDate}
                onChange={(e) => setExternalAPIForm({ ...externalAPIForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={externalAPIForm.endDate}
                onChange={(e) => setExternalAPIForm({ ...externalAPIForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Results
            </label>
            <input
              type="number"
              value={externalAPIForm.maxResults}
              onChange={(e) => setExternalAPIForm({ ...externalAPIForm, maxResults: parseInt(e.target.value) || 240 })}
              min="1"
              max="1000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchExternalEvents}
              disabled={syncLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {syncLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{syncLoading ? 'Fetching...' : 'Fetch Events'}</span>
            </button>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="dryRun"
                checked={externalAPIForm.dryRun}
                onChange={(e) => setExternalAPIForm({ ...externalAPIForm, dryRun: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="dryRun" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Dry run (preview only)
              </label>
            </div>
            
            <button
              onClick={syncExternalEvents}
              disabled={syncLoading || externalEvents.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {syncLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{syncLoading ? 'Syncing...' : 'Sync to Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* External Events Table */}
      {externalEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Fetched External Events ({externalEvents.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Card Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Event Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {externalEvents.slice(0, 50).map((event, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {event.employeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {event.cardNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded">
                        {event.eventDescription || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {event.location || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {externalEvents.length > 50 && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing first 50 events of {externalEvents.length} total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading attendance data management...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance Data Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage external API integration and attendance data synchronization
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Database },
            { id: 'sync', name: 'Bulk Sync', icon: Upload },
            { id: 'real-time', name: 'Real-time', icon: Zap },
            { id: 'external-api', name: 'External API', icon: Activity },
            { id: 'conflicts', name: 'Conflicts', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.id === 'conflicts' && conflicts.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs rounded-full px-2 py-1 ml-1">
                    {conflicts.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'sync' && renderSyncTab()}
      {activeTab === 'real-time' && renderRealTimeTab()}
      {activeTab === 'external-api' && renderExternalAPITab()}
      {activeTab === 'conflicts' && renderConflictsTab()}
    </div>
  );
};

export default AttendanceDataManagement;