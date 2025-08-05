import React, { useState, useEffect, useCallback } from 'react';
import { MagicCard, ShimmerButton } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  query?: string;
  details?: any;
}

interface LogsResponse {
  logs: LogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    levels: string[];
    sources: string[];
  };
}

interface LogsViewerProps {
  className?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

const LogsViewer: React.FC<LogsViewerProps> = ({ 
  className = '', 
  refreshInterval = 10000,
  autoRefresh = false 
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    level: 'all',
    source: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  const [availableFilters, setAvailableFilters] = useState({
    levels: [] as string[],
    sources: [] as string[]
  });
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);

  const fetchLogs = useCallback(async (reset = false) => {
    try {
      const params = new URLSearchParams({
        page: reset ? '1' : pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.level !== 'all' && { level: filters.level }),
        ...(filters.source !== 'all' && { source: filters.source }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LogsResponse = await response.json();
      
      if (reset) {
        setLogs(data.logs);
        setPagination(data.pagination);
      } else {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
      
      setAvailableFilters(data.filters);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchLogs(true);
  }, [filters]);

  useEffect(() => {
    if (autoRefreshEnabled) {
      const interval = setInterval(() => {
        if (pagination.page === 1) {
          fetchLogs(true);
        }
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, refreshInterval, pagination.page, fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchLogs();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warn': return 'text-yellow-600 bg-yellow-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'debug': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      case 'debug': return '⚪';
      default: return '⚪';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateMessage = (message: string, maxLength = 100) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.level !== 'all' && { level: filters.level }),
        ...(filters.source !== 'all' && { source: filters.source }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        format: 'csv'
      });

      const response = await fetch(`/api/admin/logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export logs:', err);
    }
  };

  if (loading) {
    return (
      <MagicCard className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </MagicCard>
    );
  }

  if (error) {
    return (
      <MagicCard className={`p-6 border-red-200 ${className}`}>
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Logs Error</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => fetchLogs(true)} 
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
      {/* Filters */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Log Filters</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                autoRefreshEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={() => fetchLogs(true)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
            >
              Refresh
            </button>
            <ShimmerButton
              onClick={exportLogs}
              className="px-3 py-1 text-sm"
            >
              Export
            </ShimmerButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Levels</option>
              {availableFilters.levels.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Sources</option>
              {availableFilters.sources.map(source => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search messages..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </MagicCard>

      {/* Logs List */}
      <MagicCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            System Logs ({pagination.total.toLocaleString()} entries)
          </h3>
          <div className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedLog(log)}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-shrink-0 pt-1">
                  <span className="text-lg">{getLevelIcon(log.level)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`px-2 py-1 rounded text-xs ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </div>
                    {log.source && (
                      <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {log.source}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-900 break-words">
                    {truncateMessage(log.message)}
                  </p>
                  
                  {(log.method || log.statusCode || log.duration) && (
                    <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                      {log.method && <span>{log.method}</span>}
                      {log.statusCode && (
                        <span className={
                          log.statusCode >= 400 ? 'text-red-600' : 
                          log.statusCode >= 300 ? 'text-yellow-600' : 'text-green-600'
                        }>
                          {log.statusCode}
                        </span>
                      )}
                      {log.duration && <span>{log.duration}ms</span>}
                      {log.ip && <span>{log.ip}</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded text-sm ${
                      page === pagination.page 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        )}
      </MagicCard>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto m-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Log Details</h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Level:</span>
                  <div className={`inline-block ml-2 px-2 py-1 rounded text-xs ${getLevelColor(selectedLog.level)}`}>
                    {selectedLog.level.toUpperCase()}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Timestamp:</span>
                  <span className="ml-2">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                {selectedLog.source && (
                  <div>
                    <span className="font-medium text-gray-700">Source:</span>
                    <span className="ml-2">{selectedLog.source}</span>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <span className="font-medium text-gray-700">User ID:</span>
                    <span className="ml-2">{selectedLog.userId}</span>
                  </div>
                )}
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Message:</span>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{selectedLog.message}</p>
              </div>
              
              {selectedLog.details && (
                <div>
                  <span className="font-medium text-gray-700">Details:</span>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
