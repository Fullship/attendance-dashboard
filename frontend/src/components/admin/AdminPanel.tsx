import React, { useState } from 'react';
import { MagicCard, FadeInStagger } from '../ui';
import { MetricsCard, ProfilerControl, CacheManager, ClusterStatus, LogsViewer, CareersManagement } from './';

interface AdminPanelProps {
  className?: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'profiler' | 'cache' | 'cluster' | 'logs' | 'careers'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'profiler', label: 'Profiler', icon: '🔍' },
    { id: 'cache', label: 'Cache', icon: '💾' },
    { id: 'cluster', label: 'Cluster', icon: '🏭' },
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'careers', label: 'Careers', icon: '💼' }
  ] as const;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <div className="text-sm text-gray-500">
            Real-time system monitoring and management
          </div>
        </div>
        
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </MagicCard>

      {/* Tab Content */}
      <FadeInStagger>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <MetricsCard className="h-fit" />
              </div>
              <div className="space-y-6">
                <ClusterStatus className="h-fit" />
              </div>
            </div>
            
            {/* Cache and Logs Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CacheManager className="h-fit" />
              <MagicCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('profiler')}
                    className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <div className="font-medium">Performance Profiling</div>
                        <div className="text-sm text-gray-600">Analyze CPU and memory usage</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="font-medium">System Logs</div>
                        <div className="text-sm text-gray-600">View and filter system logs</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('cluster')}
                    className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🏭</span>
                      <div>
                        <div className="font-medium">Cluster Management</div>
                        <div className="text-sm text-gray-600">Manage worker processes</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('careers')}
                    className="w-full p-3 text-left bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">💼</span>
                      <div>
                        <div className="font-medium">Careers Management</div>
                        <div className="text-sm text-gray-600">Manage jobs, applications & content</div>
                      </div>
                    </div>
                  </button>
                </div>
              </MagicCard>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <MetricsCard 
            pollInterval={5000}
            onDataFetch={(data) => {
              console.log('Metrics updated:', data);
            }}
          />
        )}

        {activeTab === 'profiler' && (
          <ProfilerControl 
            onProfileComplete={(result) => {
              console.log('Profile completed:', result);
            }}
          />
        )}

        {activeTab === 'cache' && (
          <CacheManager 
            refreshInterval={5000}
            onCacheCleared={() => {
              console.log('Cache cleared');
            }}
          />
        )}

        {activeTab === 'cluster' && (
          <ClusterStatus 
            refreshInterval={3000}
            onWorkerRestart={(workerId) => {
              console.log('Worker restarted:', workerId);
            }}
            onClusterRestart={() => {
              console.log('Cluster restart initiated');
            }}
          />
        )}

        {activeTab === 'logs' && (
          <LogsViewer 
            refreshInterval={10000}
            autoRefresh={true}
          />
        )}

        {activeTab === 'careers' && (
          <CareersManagement />
        )}
      </FadeInStagger>
    </div>
  );
};

export default AdminPanel;
