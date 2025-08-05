import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MagicCard, NumberTicker } from '../ui';
import { motion } from 'framer-motion';

interface MetricsData {
  timestamp: number;
  requests: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  dbConnections: number;
  cacheHitRate: number;
  errorRate: number;
}

interface SystemStats {
  requests: { total: number; rps: number; };
  responseTime: { avg: number; p95: number; p99: number; };
  memory: { used: number; total: number; percentage: number; };
  cpu: { usage: number; load: number[]; };
  database: { connections: number; queries: number; };
  cache: { hitRate: number; operations: number; };
  errors: { rate: number; count: number; };
}

interface MetricsCardProps {
  onDataFetch?: (data: MetricsData) => void;
  pollInterval?: number;
  className?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ 
  onDataFetch, 
  pollInterval = 5000, 
  className = '' 
}) => {
  const [metricsHistory, setMetricsHistory] = useState<MetricsData[]>([]);
  const [currentStats, setCurrentStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const metricsPoint: MetricsData = {
        timestamp: Date.now(),
        requests: data.requests?.rps || 0,
        responseTime: data.responseTime?.avg || 0,
        memoryUsage: data.memory?.percentage || 0,
        cpuUsage: data.cpu?.usage || 0,
        activeUsers: data.activeUsers || 0,
        dbConnections: data.database?.connections || 0,
        cacheHitRate: data.cache?.hitRate || 0,
        errorRate: data.errors?.rate || 0
      };

      setCurrentStats(data);
      setMetricsHistory(prev => {
        const newHistory = [...prev, metricsPoint];
        // Keep only last 20 data points
        return newHistory.slice(-20);
      });

      if (onDataFetch) {
        onDataFetch(metricsPoint);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [onDataFetch]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, pollInterval]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const kpiData = currentStats ? [
    { 
      name: 'Requests/sec', 
      value: currentStats.requests.rps, 
      color: '#8884d8',
      trend: metricsHistory.length > 1 ? 
        (metricsHistory[metricsHistory.length - 1].requests - metricsHistory[metricsHistory.length - 2].requests) : 0
    },
    { 
      name: 'Response Time', 
      value: currentStats.responseTime.avg, 
      unit: 'ms',
      color: '#82ca9d',
      trend: metricsHistory.length > 1 ? 
        (metricsHistory[metricsHistory.length - 1].responseTime - metricsHistory[metricsHistory.length - 2].responseTime) : 0
    },
    { 
      name: 'Memory Usage', 
      value: currentStats.memory.percentage, 
      unit: '%',
      color: '#ffc658',
      trend: metricsHistory.length > 1 ? 
        (metricsHistory[metricsHistory.length - 1].memoryUsage - metricsHistory[metricsHistory.length - 2].memoryUsage) : 0
    },
    { 
      name: 'CPU Usage', 
      value: currentStats.cpu.usage, 
      unit: '%',
      color: '#ff7300',
      trend: metricsHistory.length > 1 ? 
        (metricsHistory[metricsHistory.length - 1].cpuUsage - metricsHistory[metricsHistory.length - 2].cpuUsage) : 0
    }
  ] : [];

  if (loading) {
    return (
      <MagicCard className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </MagicCard>
    );
  }

  if (error) {
    return (
      <MagicCard className={`p-6 border-red-200 ${className}`}>
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Metrics Error</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchMetrics()} 
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </MagicCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => (
          <motion.div
            key={kpi.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MagicCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.name}</p>
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-2xl font-bold"
                      style={{ color: kpi.color }}
                    >
                      <NumberTicker value={kpi.value} />
                    </span>
                    {kpi.unit && <span className="text-sm text-gray-500">{kpi.unit}</span>}
                  </div>
                  {kpi.trend !== 0 && (
                    <div className={`flex items-center text-xs ${kpi.trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      <span>{kpi.trend > 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(kpi.trend).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: kpi.color }}
                />
              </div>
            </MagicCard>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Response Time Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTime}
                formatter={(value) => [`${value}ms`, 'Response Time']}
              />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </MagicCard>

        {/* System Resources */}
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Resources</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTime}
                formatter={(value, name) => [
                  `${value}${name === 'memoryUsage' || name === 'cpuUsage' ? '%' : ''}`, 
                  name === 'memoryUsage' ? 'Memory' : 'CPU'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="memoryUsage" 
                stroke="#ffc658" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="cpuUsage" 
                stroke="#ff7300" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </MagicCard>

        {/* Request Rate */}
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Request Rate</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metricsHistory.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={formatTime}
                formatter={(value) => [`${value}/s`, 'Requests']}
              />
              <Bar dataKey="requests" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </MagicCard>

        {/* Cache Performance */}
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cache Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                fontSize={12}
              />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip 
                labelFormatter={formatTime}
                formatter={(value) => [`${value}%`, 'Hit Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="cacheHitRate" 
                stroke="#00ff00" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </MagicCard>
      </div>

      {/* System Summary */}
      {currentStats && (
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Requests</p>
              <p className="font-semibold">{currentStats.requests.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Memory Used</p>
              <p className="font-semibold">{formatBytes(currentStats.memory.used)}</p>
            </div>
            <div>
              <p className="text-gray-600">DB Connections</p>
              <p className="font-semibold">{currentStats.database.connections}</p>
            </div>
            <div>
              <p className="text-gray-600">Error Rate</p>
              <p className="font-semibold">{currentStats.errors.rate.toFixed(2)}%</p>
            </div>
          </div>
        </MagicCard>
      )}
    </div>
  );
};

export default MetricsCard;
