import React from 'react';
import LoadingSpinner from './LoadingSpinner';

// Enhanced fallback component for lazy loading
const LazyLoadingFallback: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}> = ({ message = 'Loading...', size = 'lg', fullScreen = false }) => {
  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <LoadingSpinner size={size} />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
};

// Specific fallbacks for different types of components
export const PageLoadingFallback: React.FC<{ pageName?: string }> = ({ pageName = 'page' }) => (
  <LazyLoadingFallback message={`Loading ${pageName}...`} size="lg" fullScreen />
);

export const ComponentLoadingFallback: React.FC<{ componentName?: string }> = ({
  componentName = 'component',
}) => <LazyLoadingFallback message={`Loading ${componentName}...`} size="md" fullScreen={false} />;

export const ChartLoadingFallback: React.FC = () => (
  <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Loading chart visualization...
      </p>
    </div>
  </div>
);

export const DashboardLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>

    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-10 dark:bg-opacity-20 pointer-events-none">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  </div>
);

export default LazyLoadingFallback;
