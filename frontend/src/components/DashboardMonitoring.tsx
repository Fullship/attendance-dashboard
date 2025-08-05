import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import api from '../utils/api';

// Types for monitoring data
interface MetricsData {
  backendMetrics: {
    requestLatency: number;
    databaseSlowQueries: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    totalRequests: number;
    avgResponseTime: number;
  };
  cacheStats: {
    connected: boolean;
    keyCount: number;
    memoryUsed: string;
    hits: number;
    misses: number;
    hitRate: number;
  };
  clusterStatus: {
    activeWorkers: number;
    totalWorkers: number;
    uptime: number;
    memoryPerWorker: number[];
    cpuPerWorker: number[];
  };
  databaseStats: {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    slowQueryPercentage: number;
    poolActive: number;
    poolIdle: number;
    poolWaiting: number;
  };
}

interface AlertLog {
  id: string;
  timestamp: string;
  type: 'slow-query' | 'n+1-query' | 'crash' | 'high-memory' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
}

interface ProfilingReport {
  id: string;
  type: 'cpu' | 'memory' | 'heap';
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  fileSize?: string;
  downloadUrl?: string;
}

export const DashboardMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [profilingReports, setProfilingReports] = useState<ProfilingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedCacheKey, setSelectedCacheKey] = useState('');
  const [isProfilerRunning, setIsProfilerRunning] = useState(false);
  const [profilingType, setProfilingType] = useState<'cpu' | 'memory' | 'heap'>('memory');
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch monitoring data
  const fetchMetrics = async () => {
    try {
      const [
        cacheStatsResponse,
        dbStatsResponse,
        healthResponse,
      ] = await Promise.all([
        api.get('/admin/cache/stats'),
        api.get('/admin/db-monitor/stats'),
        api.get('/health'),
      ]);

      // Simulate additional metrics that would come from monitoring system
      const backendMetrics = {
        requestLatency: dbStatsResponse.data?.data?.averageDuration || 0,
        databaseSlowQueries: dbStatsResponse.data?.data?.slowQueries || 0,
        cacheHitRate: calculateHitRate(cacheStatsResponse.data?.data),
        memoryUsage: Math.round(process.memoryUsage?.().heapUsed / 1024 / 1024) || 0,
        cpuUsage: Math.random() * 100, // Would come from system monitoring
        errorRate: Math.random() * 5, // Would come from error tracking
        totalRequests: dbStatsResponse.data?.data?.totalQueries || 0,
        avgResponseTime: dbStatsResponse.data?.data?.averageDuration || 0,
      };

      const cacheStats = {
        connected: cacheStatsResponse.data?.data?.connected || false,
        keyCount: cacheStatsResponse.data?.data?.keyCount || 0,
        memoryUsed: cacheStatsResponse.data?.data?.memoryUsed || '0 MB',
        hits: cacheStatsResponse.data?.data?.hits || 0,
        misses: cacheStatsResponse.data?.data?.misses || 0,
        hitRate: calculateHitRate(cacheStatsResponse.data?.data),
      };

      const clusterStatus = {
        activeWorkers: healthResponse.data?.workers?.active || 1,
        totalWorkers: healthResponse.data?.workers?.total || 1,
        uptime: healthResponse.data?.uptime || 0,
        memoryPerWorker: [backendMetrics.memoryUsage],
        cpuPerWorker: [backendMetrics.cpuUsage],
      };

      const databaseStats = {
        totalQueries: dbStatsResponse.data?.data?.totalQueries || 0,
        slowQueries: dbStatsResponse.data?.data?.slowQueries || 0,
        averageDuration: dbStatsResponse.data?.data?.averageDuration || 0,
        slowQueryPercentage: dbStatsResponse.data?.data?.slowQueryPercentage || 0,
        poolActive: dbStatsResponse.data?.data?.poolActive || 0,
        poolIdle: dbStatsResponse.data?.data?.poolIdle || 0,
        poolWaiting: dbStatsResponse.data?.data?.poolWaiting || 0,
      };

      setMetrics({
        backendMetrics,
        cacheStats,
        clusterStatus,
        databaseStats,
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  // Fetch alerts and logs
  const fetchAlerts = async () => {
    try {
      // This would come from your logging/monitoring system
      // For now, simulate some alerts
      const simulatedAlerts: AlertLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'slow-query',
          severity: 'high',
          message: 'Slow query detected: SELECT * FROM attendance_records took 450ms',
          details: { duration: 450, query: 'SELECT * FROM attendance_records WHERE...' }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          type: 'high-memory',
          severity: 'medium',
          message: 'Memory usage above 80%: 342MB/400MB',
          details: { memoryUsage: 342, limit: 400 }
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          type: 'n+1-query',
          severity: 'critical',
          message: 'N+1 query pattern detected in employee dashboard',
          details: { queries: 25, endpoint: '/api/admin/employees' }
        }
      ];
      
      setAlerts(simulatedAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Fetch profiling reports
  const fetchProfilingReports = async () => {
    try {
      const response = await api.get('/admin/dev/memory/snapshots');
      if (response.data.success && response.data.snapshots) {
        const reports: ProfilingReport[] = response.data.snapshots.map((snapshot: any, index: number) => ({
          id: `report-${index}`,
          type: 'memory',
          timestamp: snapshot.timestamp,
          status: 'completed',
          fileSize: snapshot.fileSize || 'Unknown',
          downloadUrl: snapshot.filepath,
        }));
        setProfilingReports(reports);
      }
    } catch (error) {
      console.error('Failed to fetch profiling reports:', error);
    }
  };

  // Calculate cache hit rate
  const calculateHitRate = (cacheData: any): number => {
    if (!cacheData || !cacheData.hits || !cacheData.misses) return 0;
    const total = cacheData.hits + cacheData.misses;
    return total > 0 ? Math.round((cacheData.hits / total) * 100) : 0;
  };

  // Start profiling
  const startProfiling = async (label?: string) => {
    try {
      setIsProfilerRunning(true);
      let response;

      if (profilingType === 'memory' || profilingType === 'heap') {
        response = await api.post('/admin/dev/memory/snapshot', {
          label: label || `${profilingType}-profile-${Date.now()}`,
        });
      } else {
        // CPU profiling would be implemented here
        throw new Error('CPU profiling not yet implemented');
      }

      if (response.data.success) {
        await fetchProfilingReports();
        setIsProfilerRunning(false);
        return response.data.snapshot;
      }
    } catch (error) {
      console.error('Failed to start profiling:', error);
      setIsProfilerRunning(false);
      throw error;
    }
  };

  // Clear cache
  const clearCache = async (pattern?: string) => {
    try {
      const types = pattern ? [pattern] : ['attendance_records', 'dashboard_stats', 'users'];
      const response = await api.post('/admin/cache/invalidate', { types });
      
      if (response.data.success) {
        await fetchMetrics();
      }
      return response.data;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  };

  // Restart workers (would need cluster management endpoint)
  const restartWorkers = async () => {
    try {
      // This would call a cluster management endpoint
      console.log('Worker restart would be implemented with cluster management API');
      alert('Worker restart functionality would be implemented with cluster management API');
    } catch (error) {
      console.error('Failed to restart workers:', error);
      throw error;
    }
  };

  // Setup auto-refresh
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchAlerts(), fetchProfilingReports()]);
      setLoading(false);
    };

    fetchAllData();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchMetrics();
        fetchAlerts();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert: AlertLog) => 
    alertFilter === 'all' || alert.severity === alertFilter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">Failed to load monitoring data</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Monitoring Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time performance metrics and system health
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh</span>
          </label>
          
          <Button
            onClick={() => {
              fetchMetrics();
              fetchAlerts();
              fetchProfilingReports();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Request Latency */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Request Latency</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.backendMetrics.requestLatency.toFixed(0)}ms
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              metrics.backendMetrics.requestLatency > 500 ? 'bg-red-100 text-red-600' :
              metrics.backendMetrics.requestLatency > 200 ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              ⚡
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-sm ${
              metrics.backendMetrics.requestLatency > 500 ? 'text-red-600' :
              metrics.backendMetrics.requestLatency > 200 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {metrics.backendMetrics.requestLatency > 500 ? 'High latency' :
               metrics.backendMetrics.requestLatency > 200 ? 'Moderate latency' :
               'Low latency'}
            </div>
          </div>
        </Card>

        {/* Database Slow Queries */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Slow Queries</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.databaseStats.slowQueries}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              metrics.databaseStats.slowQueryPercentage > 10 ? 'bg-red-100 text-red-600' :
              metrics.databaseStats.slowQueryPercentage > 5 ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              🐌
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {metrics.databaseStats.slowQueryPercentage.toFixed(1)}% of total queries
            </div>
          </div>
        </Card>

        {/* Cache Hit Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.cacheStats.hitRate}%
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              metrics.cacheStats.hitRate > 80 ? 'bg-green-100 text-green-600' :
              metrics.cacheStats.hitRate > 60 ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-red-600'
            }`}>
              💾
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {metrics.cacheStats.connected ? 'Redis connected' : 'Redis disconnected'}
            </div>
          </div>
        </Card>

        {/* Memory Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.backendMetrics.memoryUsage}MB
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              metrics.backendMetrics.memoryUsage > 400 ? 'bg-red-100 text-red-600' :
              metrics.backendMetrics.memoryUsage > 300 ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              📊
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Cache: {metrics.cacheStats.memoryUsed}
            </div>
          </div>
        </Card>
      </div>

      {/* Profiling Controls */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Profiling
          </h3>
          <div className="flex items-center space-x-4">
            <select
              value={profilingType}
              onChange={(e) => setProfilingType(e.target.value as 'cpu' | 'memory' | 'heap')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="memory">Memory Profile</option>
              <option value="heap">Heap Snapshot</option>
              <option value="cpu" disabled>CPU Profile (Coming Soon)</option>
            </select>
            
            <Button
              onClick={() => startProfiling()}
              disabled={isProfilerRunning}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
            >
              {isProfilerRunning ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Profiling...
                </>
              ) : (
                '📈 Start Profiling'
              )}
            </Button>
          </div>
        </div>

        {/* Profiling Reports */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profilingReports.slice(0, 6).map((report) => (
            <div key={report.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Profile
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  report.status === 'completed' ? 'bg-green-100 text-green-800' :
                  report.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {report.status}
                </span>
              </div>
              
              {report.fileSize && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Size: {report.fileSize}
                </p>
              )}
              
              {report.downloadUrl && report.status === 'completed' && (
                <Button
                  onClick={() => {
                    // This would download the profiling report
                    console.log('Download report:', report.downloadUrl);
                    alert('Download functionality would open/download the profiling report');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white text-sm py-1"
                >
                  📥 Download Report
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Cache Management */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cache Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cache Stats */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Cache Statistics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={metrics.cacheStats.connected ? 'text-green-600' : 'text-red-600'}>
                  {metrics.cacheStats.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Keys:</span>
                <span className="text-gray-900 dark:text-white">{metrics.cacheStats.keyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memory Used:</span>
                <span className="text-gray-900 dark:text-white">{metrics.cacheStats.memoryUsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Hit Rate:</span>
                <span className="text-gray-900 dark:text-white">{metrics.cacheStats.hitRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cache Hits:</span>
                <span className="text-gray-900 dark:text-white">{metrics.cacheStats.hits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cache Misses:</span>
                <span className="text-gray-900 dark:text-white">{metrics.cacheStats.misses}</span>
              </div>
            </div>
          </div>

          {/* Cache Controls */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Cache Controls
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Clear Specific Cache Pattern:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={selectedCacheKey}
                    onChange={(e) => setSelectedCacheKey(e.target.value)}
                    placeholder="e.g., attendance_records, users"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <Button
                    onClick={() => clearCache(selectedCacheKey)}
                    disabled={!selectedCacheKey}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => clearCache()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2"
                >
                  🗑️ Clear All Cache
                </Button>
                <Button
                  onClick={fetchMetrics}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2"
                >
                  🔄 Refresh Stats
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cluster Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cluster Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Worker Status */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Worker Status
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Active Workers:</span>
                <span className="text-gray-900 dark:text-white">
                  {metrics.clusterStatus.activeWorkers}/{metrics.clusterStatus.totalWorkers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                <span className="text-gray-900 dark:text-white">
                  {Math.floor(metrics.clusterStatus.uptime / 3600)}h {Math.floor((metrics.clusterStatus.uptime % 3600) / 60)}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Health:</span>
                <span className={
                  metrics.clusterStatus.activeWorkers === metrics.clusterStatus.totalWorkers 
                    ? 'text-green-600' : 'text-yellow-600'
                }>
                  {metrics.clusterStatus.activeWorkers === metrics.clusterStatus.totalWorkers 
                    ? 'Healthy' : 'Degraded'}
                </span>
              </div>
            </div>
          </div>

          {/* Per-Worker Load */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Per-Worker Load
            </h4>
            <div className="space-y-2">
              {metrics.clusterStatus.memoryPerWorker.map((memory, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Worker {index + 1}:</span>
                  <div className="text-right">
                    <div className="text-gray-900 dark:text-white">{memory.toFixed(0)}MB</div>
                    <div className="text-gray-500 text-xs">
                      CPU: {metrics.clusterStatus.cpuPerWorker[index]?.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster Controls */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              Cluster Controls
            </h4>
            <div className="space-y-3">
              <Button
                onClick={restartWorkers}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2"
              >
                🔄 Restart Workers
              </Button>
              <Button
                onClick={() => {
                  console.log('Scale workers functionality would be implemented');
                  alert('Worker scaling functionality would be implemented with cluster management');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
              >
                📈 Scale Workers
              </Button>
              <Button
                onClick={() => {
                  window.open('/api/monitoring/cluster/health', '_blank');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
              >
                📊 Cluster Details
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts & Logs Viewer */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alerts & System Logs
          </h3>
          <div className="flex items-center space-x-4">
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button
              onClick={fetchAlerts}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-gray-500">No alerts found for the selected filter.</div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="mb-3 pb-3 border-b border-gray-700 last:border-b-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">
                      [{new Date(alert.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-blue-400">{alert.type}</span>
                  </div>
                </div>
                <div className="text-green-400 ml-4">
                  {alert.message}
                </div>
                {alert.details && (
                  <div className="text-gray-500 ml-4 mt-1 text-xs">
                    {JSON.stringify(alert.details, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex space-x-2">
          <Button
            onClick={() => {
              console.log('Export logs functionality would be implemented');
              alert('Log export functionality would download logs as JSON/CSV');
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2"
          >
            📥 Export Logs
          </Button>
          <Button
            onClick={() => {
              setAlerts([]);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
          >
            🗑️ Clear Alerts
          </Button>
          <Button
            onClick={() => {
              window.open('/api/admin/db-monitor/slow-queries', '_blank');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
          >
            📊 View DB Logs
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardMonitoring;
