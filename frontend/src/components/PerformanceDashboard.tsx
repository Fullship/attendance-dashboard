import React, { useState, useEffect } from 'react';
import { ReactPerformanceProfiler, usePerformanceReport } from '../utils/ReactPerformanceProfiler';
import Card from './Card';
import Button from './Button';

interface PerformanceData {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

interface ComponentStats {
  totalRenders: number;
  totalDuration: number;
  averageDuration: number;
  slowRenders: number;
  maxDuration: number;
  minDuration: number;
}

export const PerformanceDashboard: React.FC = () => {
  const { getReport, clearData, exportData } = usePerformanceReport();
  const [report, setReport] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isVisible && autoRefresh) {
      const interval = setInterval(() => {
        setReport(getReport());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible, autoRefresh, getReport]);

  const refreshReport = () => {
    setReport(getReport());
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `react-performance-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearData();
    setReport(null);
  };

  // Keyboard shortcut to toggle dashboard
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle performance dashboard
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setIsVisible(prev => !prev);
        if (!isVisible) {
          refreshReport();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  const getSeverityColor = (percentage: number) => {
    if (percentage > 20) return 'text-red-600 bg-red-100';
    if (percentage > 10) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getDurationColor = (duration: number) => {
    if (duration > 500) return 'text-red-600';
    if (duration > 200) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => {
            setIsVisible(true);
            refreshReport();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 text-sm"
        >
          📊 Performance
        </Button>
      </div>
    );
  }

  return (
    <ReactPerformanceProfiler id="PerformanceDashboard" threshold={200}>
      <div className="fixed inset-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                🚀 React Performance Dashboard
              </h2>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={e => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto-refresh</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
              >
                🔄 Refresh
              </Button>
              <Button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
              >
                💾 Export
              </Button>
              <Button
                onClick={handleClear}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-sm"
              >
                🗑️ Clear
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
              >
                ✕ Close
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {!report ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <p>No performance data available yet.</p>
                  <p className="text-sm mt-2">Use the app to generate performance metrics.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {report.totalRenders}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Renders</div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${getSeverityColor(
                          report.slowRenderPercentage
                        )} rounded px-2 py-1`}
                      >
                        {report.slowRenderPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Slow Renders</div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {Object.keys(report.componentStats).length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Components</div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {report.recentSlowRenders.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Recent Slow</div>
                    </div>
                  </Card>
                </div>

                {/* Recent Slow Renders */}
                {report.recentSlowRenders.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      🐌 Recent Slow Renders (&gt;200ms)
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {report.recentSlowRenders
                        .slice(-10)
                        .map((render: PerformanceData, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                {render.id}
                              </span>
                              <span
                                className={`text-sm px-2 py-1 rounded ${
                                  render.phase === 'mount'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {render.phase}
                              </span>
                            </div>
                            <div className="text-right">
                              <div
                                className={`font-bold ${getDurationColor(render.actualDuration)}`}
                              >
                                {render.actualDuration.toFixed(1)}ms
                              </div>
                              <div className="text-xs text-gray-500">
                                base: {render.baseDuration.toFixed(1)}ms
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}

                {/* Component Performance Stats */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    📊 Component Performance Stats
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Component
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Renders
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Avg Duration
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Max Duration
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Slow Renders
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Performance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {Object.entries(report.componentStats)
                          .sort(
                            ([, a], [, b]) =>
                              (b as ComponentStats).averageDuration -
                              (a as ComponentStats).averageDuration
                          )
                          .slice(0, 15)
                          .map(([componentId, stats]) => {
                            const componentStats = stats as ComponentStats;
                            const slowPercentage =
                              (componentStats.slowRenders / componentStats.totalRenders) * 100;

                            return (
                              <tr
                                key={componentId}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-white">
                                  {componentId}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                  {componentStats.totalRenders}
                                </td>
                                <td
                                  className={`px-4 py-2 text-sm font-medium ${getDurationColor(
                                    componentStats.averageDuration
                                  )}`}
                                >
                                  {componentStats.averageDuration.toFixed(1)}ms
                                </td>
                                <td
                                  className={`px-4 py-2 text-sm font-medium ${getDurationColor(
                                    componentStats.maxDuration
                                  )}`}
                                >
                                  {componentStats.maxDuration.toFixed(1)}ms
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                  {componentStats.slowRenders}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                                      slowPercentage
                                    )}`}
                                  >
                                    {slowPercentage.toFixed(1)}% slow
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Performance Tips */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    💡 Performance Tips
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Components with &gt;200ms render time should be optimized</p>
                    <p>• Use React.memo() for components that re-render frequently</p>
                    <p>• Consider lazy loading for heavy components</p>
                    <p>• Use useCallback and useMemo for expensive computations</p>
                    <p>• Check for unnecessary re-renders in update phase</p>
                    <p>• Press Ctrl+Shift+D to toggle this dashboard</p>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>React Performance Profiler Dashboard</span>
              <span>Press Ctrl+Shift+D to toggle | Ctrl+Shift+P for mini metrics</span>
            </div>
          </div>
        </div>
      </div>
    </ReactPerformanceProfiler>
  );
};

export default PerformanceDashboard;
