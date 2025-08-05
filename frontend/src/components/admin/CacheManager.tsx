import React, { useState, useEffect } from 'react';
import { MagicCard, ShimmerButton, NumberTicker } from '../ui';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

interface CacheStats {
  hitRate: number;
  missRate: number;
  totalOperations: number;
  totalHits: number;
  totalMisses: number;
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  keys: {
    total: number;
    expired: number;
    withTtl: number;
  };
  performance: {
    avgResponseTime: number;
    operationsPerSecond: number;
  };
  byType?: {
    [key: string]: {
      hits: number;
      misses: number;
      operations: number;
    };
  };
}

interface CacheManagerProps {
  className?: string;
  onCacheCleared?: () => void;
  refreshInterval?: number;
}

const CacheManager: React.FC<CacheManagerProps> = ({ 
  className = '', 
  onCacheCleared,
  refreshInterval = 5000 
}) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cache stats');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success(`Cache cleared successfully! Removed ${data.keysCleared || 0} keys`);
      
      if (onCacheCleared) {
        onCacheCleared();
      }
      
      // Refresh stats after clearing
      setTimeout(fetchCacheStats, 1000);
    } catch (err) {
      console.error('Failed to clear cache:', err);
      toast.error('Failed to clear cache');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
    const interval = setInterval(fetchCacheStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPieChartData = () => {
    if (!stats) return [];
    return [
      { name: 'Hits', value: stats.totalHits, color: '#10B981' },
      { name: 'Misses', value: stats.totalMisses, color: '#EF4444' }
    ];
  };

  const getTypeBreakdownData = () => {
    if (!stats?.byType) return [];
    return Object.entries(stats.byType).map(([type, data]) => ({
      type,
      hits: data.hits,
      misses: data.misses,
      total: data.operations,
      hitRate: data.operations > 0 ? (data.hits / data.operations) * 100 : 0
    }));
  };

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
          <h3 className="text-lg font-semibold mb-2">Cache Stats Error</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchCacheStats()} 
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </MagicCard>
    );
  }

  if (!stats) {
    return (
      <MagicCard className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No cache statistics available</p>
        </div>
      </MagicCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <MagicCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                <div className="flex items-center space-x-2">
                  <NumberTicker value={stats.hitRate} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <div className={`text-xs ${stats.hitRate >= 80 ? 'text-green-500' : stats.hitRate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {stats.hitRate >= 80 ? 'Excellent' : stats.hitRate >= 60 ? 'Good' : 'Poor'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                <div className="text-green-600">📊</div>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MagicCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Operations</p>
                <NumberTicker value={stats.totalOperations} />
                <div className="text-xs text-gray-500">
                  {stats.performance.operationsPerSecond.toFixed(0)}/sec
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                <div className="text-blue-600">⚡</div>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MagicCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <div className="flex items-center space-x-2">
                  <NumberTicker value={stats.memory.percentage} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.available)}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-100">
                <div className="text-purple-600">💾</div>
              </div>
            </div>
          </MagicCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MagicCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Keys</p>
                <NumberTicker value={stats.keys.total} />
                <div className="text-xs text-gray-500">
                  {stats.keys.expired} expired • {stats.keys.withTtl} with TTL
                </div>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-100">
                <div className="text-orange-600">🔑</div>
              </div>
            </div>
          </MagicCard>
        </motion.div>
      </div>

      {/* Cache Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hit/Miss Ratio */}
        <MagicCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hit/Miss Ratio</h3>
            <div className="text-sm text-gray-500">
              Avg Response: {stats.performance.avgResponseTime.toFixed(2)}ms
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={getPieChartData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getPieChartData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
            </PieChart>
          </ResponsiveContainer>
        </MagicCard>

        {/* Cache by Type */}
        {stats.byType && (
          <MagicCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance by Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getTypeBreakdownData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value, 
                    name
                  ]}
                />
                <Bar dataKey="hits" fill="#10B981" name="Hits" />
                <Bar dataKey="misses" fill="#EF4444" name="Misses" />
              </BarChart>
            </ResponsiveContainer>
          </MagicCard>
        )}
      </div>

      {/* Cache Management */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Cache Management</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchCacheStats}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
            <ShimmerButton
              onClick={clearCache}
              disabled={clearing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700"
            >
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </ShimmerButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium text-gray-700">Memory Health</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Used</span>
                <span>{stats.memory.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full ${
                    stats.memory.percentage > 80 ? 'bg-red-500' : 
                    stats.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(stats.memory.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium text-gray-700">Performance</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Ops/sec:</span>
                <span>{stats.performance.operationsPerSecond.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Avg Response:</span>
                <span>{stats.performance.avgResponseTime.toFixed(2)}ms</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium text-gray-700">Key Statistics</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Active Keys:</span>
                <span>{(stats.keys.total - stats.keys.expired).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>With TTL:</span>
                <span>{stats.keys.withTtl.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </MagicCard>
    </div>
  );
};

export default CacheManager;
