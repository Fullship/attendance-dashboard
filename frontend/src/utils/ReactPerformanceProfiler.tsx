import React, { Profiler, ProfilerOnRenderCallback } from 'react';

interface PerformanceData {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions?: Set<any>;
}

interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  threshold?: number;
  enableLogging?: boolean;
}

// Performance data collection
class PerformanceCollector {
  private static instance: PerformanceCollector;
  private performanceData: PerformanceData[] = [];
  private slowRenders: PerformanceData[] = [];
  private renderCounts = new Map<string, number>();

  static getInstance(): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector();
    }
    return PerformanceCollector.instance;
  }

  addPerformanceData(data: PerformanceData) {
    this.performanceData.push(data);

    // Track render counts
    const currentCount = this.renderCounts.get(data.id) || 0;
    this.renderCounts.set(data.id, currentCount + 1);

    // Keep only last 100 entries to prevent memory leaks
    if (this.performanceData.length > 100) {
      this.performanceData = this.performanceData.slice(-100);
    }
  }

  addSlowRender(data: PerformanceData) {
    this.slowRenders.push(data);

    // Keep only last 50 slow renders
    if (this.slowRenders.length > 50) {
      this.slowRenders = this.slowRenders.slice(-50);
    }
  }

  getPerformanceReport() {
    const componentStats = new Map<
      string,
      {
        totalRenders: number;
        totalDuration: number;
        averageDuration: number;
        slowRenders: number;
        maxDuration: number;
        minDuration: number;
      }
    >();

    this.performanceData.forEach(data => {
      const existing = componentStats.get(data.id) || {
        totalRenders: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowRenders: 0,
        maxDuration: 0,
        minDuration: Infinity,
      };

      existing.totalRenders++;
      existing.totalDuration += data.actualDuration;
      existing.maxDuration = Math.max(existing.maxDuration, data.actualDuration);
      existing.minDuration = Math.min(existing.minDuration, data.actualDuration);
      existing.averageDuration = existing.totalDuration / existing.totalRenders;

      if (data.actualDuration > 200) {
        existing.slowRenders++;
      }

      componentStats.set(data.id, existing);
    });

    return {
      componentStats: Object.fromEntries(componentStats),
      recentSlowRenders: this.slowRenders.slice(-10),
      totalRenders: this.performanceData.length,
      slowRenderPercentage: (this.slowRenders.length / this.performanceData.length) * 100 || 0,
    };
  }

  clearData() {
    this.performanceData = [];
    this.slowRenders = [];
    this.renderCounts.clear();
  }

  exportData() {
    return {
      performanceData: this.performanceData,
      slowRenders: this.slowRenders,
      renderCounts: Object.fromEntries(this.renderCounts),
      report: this.getPerformanceReport(),
      timestamp: new Date().toISOString(),
    };
  }
}

// React Performance Profiler Component
export const ReactPerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  threshold = 200,
  enableLogging = process.env.NODE_ENV === 'development',
}) => {
  const collector = PerformanceCollector.getInstance();

  const onRenderCallback: ProfilerOnRenderCallback = React.useCallback(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      const performanceData: PerformanceData = {
        id,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
      };

      // Collect performance data
      collector.addPerformanceData(performanceData);

      // Log slow renders
      if (actualDuration > threshold) {
        collector.addSlowRender(performanceData);

        if (enableLogging) {
          console.group(`🐌 Slow Render Detected: ${id}`);
          console.log(`⏱️  Duration: ${actualDuration.toFixed(2)}ms (threshold: ${threshold}ms)`);
          console.log(`📊 Phase: ${phase}`);
          console.log(`🎯 Base Duration: ${baseDuration.toFixed(2)}ms`);
          console.log(`🕐 Start Time: ${startTime.toFixed(2)}ms`);
          console.log(`✅ Commit Time: ${commitTime.toFixed(2)}ms`);

          // Provide optimization suggestions
          const suggestions = [];
          if (actualDuration > baseDuration * 2) {
            suggestions.push('Consider memoizing props or using React.memo()');
          }
          if (phase === 'update' && actualDuration > 100) {
            suggestions.push('Check for unnecessary re-renders');
          }
          if (actualDuration > 500) {
            suggestions.push('Consider code splitting or lazy loading');
          }

          if (suggestions.length > 0) {
            console.log(`💡 Optimization Suggestions:`);
            suggestions.forEach((suggestion, index) => {
              console.log(`   ${index + 1}. ${suggestion}`);
            });
          }

          console.groupEnd();
        }
      } else if (enableLogging && actualDuration > threshold * 0.7) {
        // Warn about approaching threshold
        console.warn(
          `⚠️  Component "${id}" render time: ${actualDuration.toFixed(
            2
          )}ms (approaching ${threshold}ms threshold)`
        );
      }
    },
    [id, threshold, enableLogging, collector]
  );

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};

// Performance monitoring utilities
export const usePerformanceReport = () => {
  const collector = PerformanceCollector.getInstance();

  const getReport = React.useCallback(() => {
    return collector.getPerformanceReport();
  }, [collector]);

  const clearData = React.useCallback(() => {
    collector.clearData();
  }, [collector]);

  const exportData = React.useCallback(() => {
    return collector.exportData();
  }, [collector]);

  return { getReport, clearData, exportData };
};

// Performance metrics component for debugging
export const PerformanceMetrics: React.FC<{ show?: boolean }> = ({ show = false }) => {
  const { getReport } = usePerformanceReport();
  const [report, setReport] = React.useState<any>(null);
  const [isVisible, setIsVisible] = React.useState(show);

  React.useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setReport(getReport());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isVisible, getReport]);

  // Keyboard shortcut to toggle performance metrics
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+P to toggle performance metrics
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible || !report) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-lg max-w-md z-50 text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">React Performance Metrics</h3>
        <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Total Renders:</strong> {report.totalRenders}
        </div>
        <div>
          <strong>Slow Renders:</strong> {report.recentSlowRenders.length}(
          {report.slowRenderPercentage.toFixed(1)}%)
        </div>

        {report.recentSlowRenders.length > 0 && (
          <div>
            <strong>Recent Slow Components:</strong>
            <div className="mt-1 max-h-20 overflow-y-auto">
              {report.recentSlowRenders.slice(-3).map((render: any, index: number) => (
                <div key={index} className="text-red-300">
                  {render.id}: {render.actualDuration.toFixed(1)}ms
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-gray-300 text-xs mt-2">Press Ctrl+Shift+P to toggle</div>
      </div>
    </div>
  );
};

// Global performance monitoring functions for console access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).reactPerformance = {
    getReport: () => PerformanceCollector.getInstance().getPerformanceReport(),
    exportData: () => PerformanceCollector.getInstance().exportData(),
    clearData: () => PerformanceCollector.getInstance().clearData(),
    help: () => {
      console.log(`
🚀 React Performance Monitoring Commands:

window.reactPerformance.getReport()  - Get performance summary
window.reactPerformance.exportData() - Export all performance data
window.reactPerformance.clearData()  - Clear collected data
window.reactPerformance.help()       - Show this help

Keyboard Shortcuts:
- Ctrl+Shift+P: Toggle performance metrics overlay
      `);
    },
  };

  console.log(
    '🚀 React Performance Monitoring enabled! Type "window.reactPerformance.help()" for commands.'
  );
}

export default ReactPerformanceProfiler;
