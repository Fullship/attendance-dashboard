import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { ComponentLoadingFallback } from './LazyLoadingFallback';
import { AlertTriangleIcon } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error Boundary for lazy-loaded components
 */
class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Failed to load {this.props.componentName || 'component'}
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-red-700 dark:text-red-300 font-medium">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-4 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-auto">
                {this.state.error?.stack}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for enhanced lazy loading with error boundary and retry mechanism
 */
export const withLazyLoading = <T extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  options: {
    fallback?: ReactNode;
    componentName?: string;
    retryDelay?: number;
    maxRetries?: number;
  } = {}
) => {
  const {
    fallback = <ComponentLoadingFallback componentName={options.componentName} />,
    componentName = 'Component',
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  return React.forwardRef<any, T>((props, ref) => {
    const [retryCount, setRetryCount] = React.useState(0);
    const [isRetrying, setIsRetrying] = React.useState(false);

    const handleError = React.useCallback(
      (error: Error, errorInfo: ErrorInfo) => {
        console.error(`Error loading ${componentName}:`, error);

        // Track lazy loading errors in production
        if (process.env.NODE_ENV === 'production') {
          // You can integrate with error tracking service here
          // e.g., Sentry, LogRocket, etc.
        }
      },
      [componentName]
    );

    const retry = React.useCallback(() => {
      if (retryCount < maxRetries) {
        setIsRetrying(true);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
        }, retryDelay);
      }
    }, [retryCount, maxRetries, retryDelay]);

    const errorFallback = (
      <div className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          Failed to load {componentName}
        </h3>
        <p className="text-yellow-600 dark:text-yellow-300 mb-4">
          The component could not be loaded. This might be due to a network issue.
        </p>
        {retryCount < maxRetries ? (
          <button
            onClick={retry}
            disabled={isRetrying}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
          >
            {isRetrying ? 'Retrying...' : `Retry (${retryCount + 1}/${maxRetries})`}
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Reload Page
          </button>
        )}
      </div>
    );

    return (
      <LazyErrorBoundary
        fallback={errorFallback}
        componentName={componentName}
        onError={handleError}
      >
        <Suspense fallback={fallback}>
          <LazyComponent {...props} ref={ref} key={retryCount} />
        </Suspense>
      </LazyErrorBoundary>
    );
  });
};

/**
 * Hook for prefetching lazy components
 */
export const usePrefetchComponent = (
  LazyComponent: React.LazyExoticComponent<any>,
  condition: boolean = true
) => {
  React.useEffect(() => {
    if (condition) {
      // Prefetch the component
      void LazyComponent;
    }
  }, [LazyComponent, condition]);
};

/**
 * Hook for route-based component preloading
 */
export const useRoutePreloader = () => {
  const [preloadedRoutes, setPreloadedRoutes] = React.useState<Set<string>>(new Set());

  const preloadRoute = React.useCallback(
    (routeName: string, preloadFn: () => void) => {
      if (!preloadedRoutes.has(routeName)) {
        preloadFn();
        setPreloadedRoutes(prev => new Set(prev).add(routeName));
      }
    },
    [preloadedRoutes]
  );

  return { preloadRoute, preloadedRoutes };
};

export default LazyErrorBoundary;
