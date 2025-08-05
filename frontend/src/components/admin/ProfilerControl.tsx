import React, { useState, useEffect } from 'react';
import { MagicCard, ShimmerButton } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ProfilerStatus {
  cpu: {
    running: boolean;
    startTime?: number;
    duration?: number;
  };
  memory: {
    running: boolean;
    startTime?: number;
    snapshots: number;
  };
}

interface ProfileResult {
  id: string;
  type: 'cpu' | 'memory';
  filename: string;
  size: number;
  createdAt: string;
  downloadUrl: string;
}

interface ProfilerControlProps {
  className?: string;
  onProfileComplete?: (result: ProfileResult) => void;
}

const ProfilerControl: React.FC<ProfilerControlProps> = ({ 
  className = '', 
  onProfileComplete 
}) => {
  const [status, setStatus] = useState<ProfilerStatus>({
    cpu: { running: false },
    memory: { running: false, snapshots: 0 }
  });
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [cpuDuration, setCpuDuration] = useState(30); // seconds

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/profiler/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch profiler status:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/admin/profiler/memory/snapshots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchProfiles();
    
    // Poll status every 2 seconds
    const interval = setInterval(() => {
      fetchStatus();
      if (!status.cpu.running && !status.memory.running) {
        fetchProfiles();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startCpuProfiling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiler/cpu/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ duration: cpuDuration })
      });

      if (response.ok) {
        toast.success(`CPU profiling started for ${cpuDuration} seconds`);
        fetchStatus();
        
        // Auto-stop after duration
        setTimeout(() => {
          stopCpuProfiling();
        }, cpuDuration * 1000);
      } else {
        throw new Error('Failed to start CPU profiling');
      }
    } catch (error) {
      toast.error('Failed to start CPU profiling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stopCpuProfiling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiler/cpu/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('CPU profiling stopped. Profile ready for download.');
        
        if (data.downloadUrl && onProfileComplete) {
          onProfileComplete({
            id: data.filename,
            type: 'cpu',
            filename: data.filename,
            size: data.size || 0,
            createdAt: new Date().toISOString(),
            downloadUrl: data.downloadUrl
          });
        }
        
        fetchStatus();
        fetchProfiles();
      } else {
        throw new Error('Failed to stop CPU profiling');
      }
    } catch (error) {
      toast.error('Failed to stop CPU profiling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const takeMemorySnapshot = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiler/memory/snapshot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Memory snapshot created successfully');
        
        if (data.downloadUrl && onProfileComplete) {
          onProfileComplete({
            id: data.filename,
            type: 'memory',
            filename: data.filename,
            size: data.size || 0,
            createdAt: new Date().toISOString(),
            downloadUrl: data.downloadUrl
          });
        }
        
        fetchStatus();
        fetchProfiles();
      } else {
        throw new Error('Failed to create memory snapshot');
      }
    } catch (error) {
      toast.error('Failed to create memory snapshot');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startMemoryProfiling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiler/memory/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Memory profiling session started');
        fetchStatus();
      } else {
        throw new Error('Failed to start memory profiling');
      }
    } catch (error) {
      toast.error('Failed to start memory profiling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stopMemoryProfiling = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/profiler/memory/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Memory profiling session stopped');
        
        if (data.downloadUrl && onProfileComplete) {
          onProfileComplete({
            id: data.filename,
            type: 'memory',
            filename: data.filename,
            size: data.size || 0,
            createdAt: new Date().toISOString(),
            downloadUrl: data.downloadUrl
          });
        }
        
        fetchStatus();
        fetchProfiles();
      } else {
        throw new Error('Failed to stop memory profiling');
      }
    } catch (error) {
      toast.error('Failed to stop memory profiling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRemainingTime = () => {
    if (!status.cpu.running || !status.cpu.startTime) return 0;
    const elapsed = (Date.now() - status.cpu.startTime) / 1000;
    return Math.max(0, cpuDuration - elapsed);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* CPU Profiling */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">CPU Profiling</h3>
          <div className={`px-2 py-1 rounded-full text-xs ${
            status.cpu.running ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {status.cpu.running ? 'Running' : 'Idle'}
          </div>
        </div>

        <div className="space-y-4">
          {!status.cpu.running ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Duration:</label>
                <select
                  value={cpuDuration}
                  onChange={(e) => setCpuDuration(Number(e.target.value))}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
              <ShimmerButton
                onClick={startCpuProfiling}
                disabled={loading}
                className="px-4 py-2"
              >
                {loading ? 'Starting...' : 'Start CPU Profiling'}
              </ShimmerButton>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Profiling in progress...</span>
                <span className="text-sm font-mono">
                  {getRemainingTime().toFixed(0)}s remaining
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${((cpuDuration - getRemainingTime()) / cpuDuration) * 100}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <button
                onClick={stopCpuProfiling}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
              >
                {loading ? 'Stopping...' : 'Stop Early'}
              </button>
            </div>
          )}
        </div>
      </MagicCard>

      {/* Memory Profiling */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Memory Profiling</h3>
          <div className={`px-2 py-1 rounded-full text-xs ${
            status.memory.running ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {status.memory.running ? 'Session Active' : 'No Session'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ShimmerButton
              onClick={takeMemorySnapshot}
              disabled={loading}
              className="px-4 py-2"
            >
              {loading ? 'Creating...' : 'Take Snapshot'}
            </ShimmerButton>
            
            {!status.memory.running ? (
              <ShimmerButton
                onClick={startMemoryProfiling}
                disabled={loading}
                className="px-4 py-2"
              >
                {loading ? 'Starting...' : 'Start Session'}
              </ShimmerButton>
            ) : (
              <button
                onClick={stopMemoryProfiling}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                {loading ? 'Stopping...' : 'Stop Session'}
              </button>
            )}

            <div className="text-sm text-gray-600 flex items-center">
              Snapshots: {status.memory.snapshots}
            </div>
          </div>

          {status.memory.running && status.memory.startTime && (
            <div className="text-sm text-gray-600">
              Session started: {formatDate(new Date(status.memory.startTime).toISOString())}
            </div>
          )}
        </div>
      </MagicCard>

      {/* Profile Results */}
      {profiles.length > 0 && (
        <MagicCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generated Profiles</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded text-xs ${
                      profile.type === 'cpu' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {profile.type.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{profile.filename}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(profile.createdAt)} • {formatFileSize(profile.size)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={profile.downloadUrl}
                    download={profile.filename}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                  >
                    Download
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </MagicCard>
      )}
    </div>
  );
};

export default ProfilerControl;
