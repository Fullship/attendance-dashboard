import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import React from 'react';

/**
 * Datadog Real User Monitoring (RUM) and Logging Configuration
 * for React Frontend
 */

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Datadog configuration
const DATADOG_CONFIG = {
  applicationId: process.env.REACT_APP_DD_APPLICATION_ID || 'your-app-id',
  clientToken: process.env.REACT_APP_DD_CLIENT_TOKEN || 'your-client-token',
  site: (process.env.REACT_APP_DD_SITE || 'datadoghq.com') as any,
  service: 'attendance-dashboard-frontend',
  env: process.env.REACT_APP_DD_ENV || process.env.NODE_ENV || 'development',
  version: process.env.REACT_APP_VERSION || '1.0.0',
};

/**
 * Initialize Datadog RUM (Real User Monitoring)
 */
export const initializeDatadogRUM = () => {
  if (!DATADOG_CONFIG.applicationId || !DATADOG_CONFIG.clientToken) {
    console.warn('Datadog RUM not initialized: missing applicationId or clientToken');
    return;
  }

  datadogRum.init({
    applicationId: DATADOG_CONFIG.applicationId,
    clientToken: DATADOG_CONFIG.clientToken,
    site: DATADOG_CONFIG.site,
    service: DATADOG_CONFIG.service,
    env: DATADOG_CONFIG.env,
    version: DATADOG_CONFIG.version,

    // Sampling configuration
    sessionSampleRate: isDevelopment ? 100 : 10, // 100% in dev, 10% in prod
    sessionReplaySampleRate: isDevelopment ? 100 : 5, // Session replay
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,

    // Default privacy settings
    defaultPrivacyLevel: 'mask-user-input',

    // Performance tracking
    enableExperimentalFeatures: ['clickmap'],

    // Custom configuration
    beforeSend: (event, context) => {
      // Add custom context
      if (event.type === 'view') {
        event.context = {
          ...event.context,
          buildHash: process.env.REACT_APP_BUILD_HASH,
          buildTime: process.env.REACT_APP_BUILD_TIME,
        };
      }

      // Filter out sensitive data in development
      if (isDevelopment) {
        // Don't send certain events in development
        if (event.view?.url?.includes('localhost')) {
          event.view.url = event.view.url.replace(/localhost:\d+/, 'localhost:****');
        }
      }

      return true; // Return true to send the event
    },

    // Allowed origins for tracking
    allowedTracingUrls: [
      { match: /^https?:\/\/localhost(:\d+)?\//, propagatorTypes: ['datadog'] },
      { match: /^https?:\/\/.*\.yourdomain\.com\//, propagatorTypes: ['datadog'] },
    ],
  });

  console.log('✅ Datadog RUM initialized');
};

/**
 * Initialize Datadog Logs
 */
export const initializeDatadogLogs = () => {
  if (!DATADOG_CONFIG.clientToken) {
    console.warn('Datadog Logs not initialized: missing clientToken');
    return;
  }

  datadogLogs.init({
    clientToken: DATADOG_CONFIG.clientToken,
    site: DATADOG_CONFIG.site,
    service: DATADOG_CONFIG.service,
    env: DATADOG_CONFIG.env,
    version: DATADOG_CONFIG.version,

    // Log levels
    forwardErrorsToLogs: true,
    forwardConsoleLogs: isDevelopment ? 'all' : ['error', 'warn'],
    forwardReports: ['intervention', 'deprecation', 'csp_violation'],

    // Context
    beforeSend: (log, context) => {
      // Add user context if available
      const user = getCurrentUser(); // You'll need to implement this
      if (user) {
        log.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }

      // Add build context
      (log as any).buildHash = process.env.REACT_APP_BUILD_HASH;
      (log as any).buildTime = process.env.REACT_APP_BUILD_TIME;

      return true; // Return true to send the log
    },
  });

  console.log('✅ Datadog Logs initialized');
};
/**
 * Get current user context (implement based on your auth system)
 */
const getCurrentUser = () => {
  // This should integrate with your auth context
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Track Web Vitals metrics
 */
export const trackWebVitals = () => {
  const reportMetric = (metric: Metric) => {
    datadogRum.addAction('web-vital', {
      name: metric.name,
      value: metric.value,
      rating: getVitalRating(metric.name, metric.value),
      id: metric.id,
    });

    // Also log to console in development
    if (isDevelopment) {
      console.log(
        `Web Vital - ${metric.name}:`,
        metric.value,
        getVitalRating(metric.name, metric.value)
      );
    }
  };

  // Track all Web Vitals
  getCLS(reportMetric);
  getFID(reportMetric);
  getFCP(reportMetric);
  getLCP(reportMetric);
  getTTFB(reportMetric);
};

/**
 * Get rating for Web Vital metric
 */
const getVitalRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FID: [100, 300],
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
  };

  const [good, poor] = thresholds[name] || [0, Infinity];

  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
};

/**
 * Custom performance tracking utilities
 */
export class PerformanceTracker {
  static trackPageLoad(pageName: string, startTime: number = performance.now()) {
    const loadTime = performance.now() - startTime;

    datadogRum.addAction('page-load', {
      page: pageName,
      loadTime,
      navigation: window.performance.getEntriesByType('navigation')[0],
    });

    if (isDevelopment) {
      console.log(`Page Load - ${pageName}:`, loadTime + 'ms');
    }
  }

  static trackUserAction(actionName: string, context: Record<string, any> = {}) {
    datadogRum.addAction(actionName, {
      ...context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  static trackError(error: Error, context: Record<string, any> = {}) {
    datadogRum.addError(error, {
      ...context,
      errorBoundary: false,
      timestamp: Date.now(),
      url: window.location.href,
    });

    // Also log to Datadog Logs
    datadogLogs.logger.error('Frontend Error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
    });
  }

  static trackAPICall(endpoint: string, method: string, duration: number, status: number) {
    datadogRum.addAction('api-call', {
      endpoint,
      method,
      duration,
      status,
      success: status >= 200 && status < 400,
    });
  }

  static trackComponentRender(componentName: string, renderTime: number) {
    datadogRum.addAction('component-render', {
      component: componentName,
      renderTime,
    });
  }

  static trackRouteChange(from: string, to: string, loadTime: number) {
    datadogRum.addAction('route-change', {
      from,
      to,
      loadTime,
    });
  }

  static setUserContext(user: any) {
    datadogRum.setUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    datadogLogs.setUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  static addGlobalContext(key: string, value: any) {
    // Use setGlobalContextProperty instead of addAttribute
    datadogRum.setGlobalContextProperty(key, value);
    datadogLogs.setGlobalContextProperty(key, value);
  }
}

/**
 * React component performance HOC
 */
export const withPerformanceTracking = <T extends React.ComponentType<any>>(
  WrappedComponent: T,
  componentName: string
) => {
  const PerformanceTrackedComponent = React.forwardRef<any, React.ComponentProps<T>>(
    (props, ref) => {
      const renderStart = React.useRef<number>(0);

      React.useEffect(() => {
        renderStart.current = performance.now();
      });

      React.useLayoutEffect(() => {
        const renderTime = performance.now() - renderStart.current;
        PerformanceTracker.trackComponentRender(componentName, renderTime);
      });

      return React.createElement(WrappedComponent, { ...props, ref });
    }
  );

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${componentName})`;

  return PerformanceTrackedComponent;
};

/**
 * Initialize all Datadog monitoring
 */
export const initializeDatadog = () => {
  try {
    initializeDatadogRUM();
    initializeDatadogLogs();
    trackWebVitals();

    // Track initial page load
    window.addEventListener('load', () => {
      PerformanceTracker.trackPageLoad('initial-load');
    });

    // Track unhandled errors
    window.addEventListener('error', event => {
      PerformanceTracker.trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      PerformanceTracker.trackError(new Error(event.reason), {
        type: 'unhandled-promise-rejection',
      });
    });

    console.log('✅ Datadog monitoring initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Datadog:', error);
  }
};

export default {
  initializeDatadog,
  PerformanceTracker,
  trackWebVitals,
  withPerformanceTracking,
};
