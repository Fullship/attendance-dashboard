import React, { useState, useEffect } from 'react';
import { MagicCard, ShimmerButton, NumberTicker } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface WorkerInfo {
  id: number;
  pid: number;
  uptime: number;
  restarts: number;
  status: 'online' | 'offline' | 'restarting' | 'error';
  memory: number;
  cpu: number;
  connections: number;
  requests: number;
}

interface ClusterStatus {
  master: {
    pid: number;
    uptime: number;
    memory: number;
  };
  workers: WorkerInfo[];
  stats: {
    totalWorkers: number;
    aliveWorkers: number;
    totalMemory: number;
    totalRequests: number;
    totalConnections: number;
    restartCount: number;
  };
  health: 'healthy' | 'degraded' | 'critical';
}

interface ClusterStatusProps {
  className?: string;
  onWorkerRestart?: (workerId: number) => void;
  onClusterRestart?: () => void;
  refreshInterval?: number;
}

const ClusterStatusComponent: React.FC<ClusterStatusProps> = ({ 
  className = '', 
  onWorkerRestart,
  onClusterRestart,
  refreshInterval = 3000 
}) => {
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<{ [key: number]: boolean }>({});
  const [clusterRestarting, setClusterRestarting] = useState(false);

  const fetchClusterStatus = async () => {
    try {
      const response = await fetch('/api/admin/cluster/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cluster status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cluster status');
    } finally {
      setLoading(false);
    }
  };

  const restartWorker = async (workerId: number) => {
    setRestarting(prev => ({ ...prev, [workerId]: true }));
    try {
      const response = await fetch(`/api/admin/cluster/restart-worker/${workerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success(`Worker ${workerId} restart initiated`);
      
      if (onWorkerRestart) {
        onWorkerRestart(workerId);
      }
      
      // Refresh status after a delay
      setTimeout(fetchClusterStatus, 2000);
    } catch (err) {
      console.error(`Failed to restart worker ${workerId}:`, err);
      toast.error(`Failed to restart worker ${workerId}`);
    } finally {
      setRestarting(prev => ({ ...prev, [workerId]: false }));
    }
  };

  const restartCluster = async () => {
    if (!window.confirm('Are you sure you want to restart the entire cluster? This will cause temporary downtime.')) {
      return;
    }

    setClusterRestarting(true);
    try {
      const response = await fetch('/api/admin/cluster/restart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success('Cluster restart initiated. This may take a few moments...');
      
      if (onClusterRestart) {
        onClusterRestart();
      }
      
      // Refresh status after a delay
      setTimeout(fetchClusterStatus, 5000);
    } catch (err) {
      console.error('Failed to restart cluster:', err);
      toast.error('Failed to restart cluster');
    } finally {
      setClusterRestarting(false);
    }
  };

  useEffect(() => {
    fetchClusterStatus();
    const interval = setInterval(fetchClusterStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'restarting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
          <h3 className="text-lg font-semibold mb-2">Cluster Status Error</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchClusterStatus()} 
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </MagicCard>
    );
  }

  if (!status) {
    return (
      <MagicCard className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No cluster status available</p>
        </div>
      </MagicCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cluster Overview */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Cluster Overview</h3>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs ${getHealthColor(status.health)}`}>
              {status.health.toUpperCase()}
            </div>
            <button
              onClick={fetchClusterStatus}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-600">Workers</p>
            <div className="flex items-center space-x-2">
              <NumberTicker value={status.stats.aliveWorkers} />
              <span className="text-sm text-gray-500">/ {status.stats.totalWorkers}</span>
            </div>
            <div className="text-xs text-gray-500">
              {((status.stats.aliveWorkers / status.stats.totalWorkers) * 100).toFixed(0)}% online
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-600">Total Memory</p>
            <div className="text-lg font-semibold">{formatBytes(status.stats.totalMemory)}</div>
            <div className="text-xs text-gray-500">
              Master: {formatBytes(status.master.memory)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-600">Total Requests</p>
            <NumberTicker value={status.stats.totalRequests} />
            <div className="text-xs text-gray-500">
              {status.stats.totalConnections} connections
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gray-50 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-600">Master Uptime</p>
            <div className="text-lg font-semibold">{formatUptime(status.master.uptime)}</div>
            <div className="text-xs text-gray-500">
              PID: {status.master.pid}
            </div>
          </motion.div>
        </div>
      </MagicCard>

      {/* Worker Details */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Worker Status</h3>
          <ShimmerButton
            onClick={restartCluster}
            disabled={clusterRestarting}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700"
          >
            {clusterRestarting ? 'Restarting Cluster...' : 'Restart Cluster'}
          </ShimmerButton>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {status.workers.map((worker, index) => (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`px-2 py-1 rounded text-xs ${getStatusColor(worker.status)}`}>
                    Worker {worker.id}
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">PID:</span> {worker.pid}
                    </div>
                    <div>
                      <span className="text-gray-500">Uptime:</span> {formatUptime(worker.uptime)}
                    </div>
                    <div>
                      <span className="text-gray-500">Memory:</span> {formatBytes(worker.memory)}
                    </div>
                    <div>
                      <span className="text-gray-500">Requests:</span> {worker.requests.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-gray-500">Restarts:</span> {worker.restarts}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {worker.status === 'online' && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>CPU: {worker.cpu.toFixed(1)}%</span>
                      <span>Conn: {worker.connections}</span>
                    </div>
                  )}
                  <button
                    onClick={() => restartWorker(worker.id)}
                    disabled={restarting[worker.id] || worker.status === 'restarting'}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {restarting[worker.id] ? 'Restarting...' : 'Restart'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </MagicCard>

      {/* Cluster Statistics */}
      <MagicCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Load Distribution</h4>
            <div className="space-y-2">
              {status.workers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between text-sm">
                  <span>Worker {worker.id}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((worker.requests / Math.max(...status.workers.map(w => w.requests))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="w-12 text-xs">{worker.requests}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Memory Usage</h4>
            <div className="space-y-2">
              {status.workers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between text-sm">
                  <span>Worker {worker.id}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((worker.memory / Math.max(...status.workers.map(w => w.memory))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="w-12 text-xs">{formatBytes(worker.memory)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Health Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Online Workers:</span>
                <span className="font-medium">{status.stats.aliveWorkers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Restarts:</span>
                <span className="font-medium">{status.stats.restartCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Health Score:</span>
                <span className={`font-medium ${
                  status.health === 'healthy' ? 'text-green-600' :
                  status.health === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {((status.stats.aliveWorkers / status.stats.totalWorkers) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </MagicCard>
    </div>
  );
};

export default ClusterStatusComponent;
