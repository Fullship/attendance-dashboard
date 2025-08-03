import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { PerformanceTracker } from '../utils/datadog';

/**
 * Custom hook for Datadog performance monitoring
 */
export const useDatadogPerformance = () => {
  const location = useLocation();

  // Track route changes
  useEffect(() => {
    const startTime = performance.now();

    // Track route change completion
    const timer = setTimeout(() => {
      const loadTime = performance.now() - startTime;
      PerformanceTracker.trackRouteChange(
        document.referrer || 'direct',
        location.pathname,
        loadTime
      );
    }, 100); // Small delay to ensure route has loaded

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Track page load performance
  const trackPageLoad = useCallback((pageName: string) => {
    PerformanceTracker.trackPageLoad(pageName);
  }, []);

  // Track user actions
  const trackUserAction = useCallback(
    (actionName: string, context: Record<string, any> = {}) => {
      PerformanceTracker.trackUserAction(actionName, {
        ...context,
        currentPath: location.pathname,
      });
    },
    [location.pathname]
  );

  // Track errors
  const trackError = useCallback(
    (error: Error, context: Record<string, any> = {}) => {
      PerformanceTracker.trackError(error, {
        ...context,
        currentPath: location.pathname,
      });
    },
    [location.pathname]
  );

  // Track API calls
  const trackAPICall = useCallback(
    (endpoint: string, method: string, duration: number, status: number) => {
      PerformanceTracker.trackAPICall(endpoint, method, duration, status);
    },
    []
  );

  return {
    trackPageLoad,
    trackUserAction,
    trackError,
    trackAPICall,
  };
};

/**
 * Hook for monitoring component performance
 */
export const useComponentPerformance = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      PerformanceTracker.trackComponentRender(componentName, renderTime);
    };
  }, [componentName]);
};

/**
 * Hook for monitoring API calls with automatic timing
 */
export const useAPIMonitoring = () => {
  const trackAPICall = useCallback(
    async <T>(apiCall: () => Promise<T>, endpoint: string, method: string = 'GET'): Promise<T> => {
      const startTime = performance.now();
      let status = 0;

      try {
        const result = await apiCall();
        status = 200; // Assume success if no error
        return result;
      } catch (error: any) {
        status = error.status || error.response?.status || 500;
        throw error;
      } finally {
        const duration = performance.now() - startTime;
        PerformanceTracker.trackAPICall(endpoint, method, duration, status);
      }
    },
    []
  );

  return { trackAPICall };
};
