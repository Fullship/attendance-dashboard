import React, { Suspense } from 'react';
import {
  DashboardLoadingFallback,
  ComponentLoadingFallback,
  ChartLoadingFallback,
} from '../components/LazyLoadingFallback';
import { withLazyLoading, usePrefetchComponent } from '../components/LazyErrorBoundary';

// ============================================================================
// ENHANCED LAZY LOADED PAGES WITH ERROR BOUNDARIES
// ============================================================================

// Authentication Pages with retry mechanism
export const LazyLoginPage = React.lazy(() =>
  import('../pages/LoginPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load LoginPage:', error);
      throw error;
    })
);

export const LazyRegisterPage = React.lazy(() =>
  import('../pages/RegisterPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load RegisterPage:', error);
      throw error;
    })
);

export const LazyForgotPasswordPage = React.lazy(() =>
  import('../pages/ForgotPasswordPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load ForgotPasswordPage:', error);
      throw error;
    })
);

export const LazyResetPasswordPage = React.lazy(() =>
  import('../pages/ResetPasswordPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load ResetPasswordPage:', error);
      throw error;
    })
);

// Dashboard Pages
export const LazyEmployeeDashboard = React.lazy(() =>
  import('../pages/EmployeeDashboard')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load EmployeeDashboard:', error);
      throw error;
    })
);

export const LazyAdminDashboard = React.lazy(() =>
  import('../pages/AdminDashboard')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load AdminDashboard:', error);
      throw error;
    })
);

export const LazyLoadingDemo = React.lazy(() =>
  import('../pages/LazyLoadingDemo')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load LazyLoadingDemo:', error);
      throw error;
    })
);

export const LazyEmployeeDetailsPage = React.lazy(() =>
  import('../pages/EmployeeDetailsPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load EmployeeDetailsPage:', error);
      throw error;
    })
);

export const LazyCareersPage = React.lazy(() =>
  import('../pages/CareersPage')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load CareersPage:', error);
      throw error;
    })
);

// Component Pages
export const LazyReactFlowOrganizationalChart = React.lazy(() =>
  import('../components/ReactFlowOrganizationalChart')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load ReactFlowOrganizationalChart:', error);
      throw error;
    })
);

export const LazyPerformanceDashboard = React.lazy(() =>
  import('../components/PerformanceDashboard')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load PerformanceDashboard:', error);
      throw error;
    })
);

export const LazyLeaveRequestsManagement = React.lazy(() =>
  import('../components/LeaveRequestsManagement')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load LeaveRequestsManagement:', error);
      throw error;
    })
);

export const LazyLeaveManagement = React.lazy(() =>
  import('../components/LeaveManagement')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load LeaveManagement:', error);
      throw error;
    })
);

export const LazyTeamManager = React.lazy(() =>
  import('../components/TeamManager')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load TeamManager:', error);
      throw error;
    })
);

export const LazyLocationManager = React.lazy(() =>
  import('../components/LocationManager')
    .then(module => ({ default: module.default }))
    .catch(error => {
      console.error('Failed to load LocationManager:', error);
      throw error;
    })
);

// ============================================================================
// SUSPENSE WRAPPED COMPONENTS WITH ERROR BOUNDARIES
// ============================================================================

// Auth pages with suspense
export const LoginPageWithSuspense = withLazyLoading(LazyLoginPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'LoginPage',
});

export const RegisterPageWithSuspense = withLazyLoading(LazyRegisterPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'RegisterPage',
});

export const ForgotPasswordPageWithSuspense = withLazyLoading(LazyForgotPasswordPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'ForgotPasswordPage',
});

export const ResetPasswordPageWithSuspense = withLazyLoading(LazyResetPasswordPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'ResetPasswordPage',
});

export const EmployeeDashboardWithSuspense = withLazyLoading(LazyEmployeeDashboard, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'EmployeeDashboard',
});

export const AdminDashboardWithSuspense = withLazyLoading(LazyAdminDashboard, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'AdminDashboard',
});

export const LazyLoadingDemoWithSuspense = withLazyLoading(LazyLoadingDemo, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'LazyLoadingDemo',
});

export const EmployeeDetailsPageWithSuspense = withLazyLoading(LazyEmployeeDetailsPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'EmployeeDetailsPage',
});

export const CareersPageWithSuspense = withLazyLoading(LazyCareersPage, {
  fallback: <DashboardLoadingFallback />,
  componentName: 'CareersPage',
});

export const ReactFlowOrganizationalChartWithSuspense = withLazyLoading(
  LazyReactFlowOrganizationalChart,
  {
    fallback: <ChartLoadingFallback />,
    componentName: 'ReactFlowOrganizationalChart',
  }
);

export const PerformanceDashboardWithSuspense = withLazyLoading(LazyPerformanceDashboard, {
  fallback: <ChartLoadingFallback />,
  componentName: 'PerformanceDashboard',
});

export const LeaveRequestsManagementWithSuspense = withLazyLoading(LazyLeaveRequestsManagement, {
  fallback: <ComponentLoadingFallback />,
  componentName: 'LeaveRequestsManagement',
});

export const LeaveManagementWithSuspense = withLazyLoading(LazyLeaveManagement, {
  fallback: <ComponentLoadingFallback />,
  componentName: 'LeaveManagement',
});

export const TeamManagerWithSuspense = withLazyLoading(LazyTeamManager, {
  fallback: <ComponentLoadingFallback />,
  componentName: 'TeamManager',
});

export const LocationManagerWithSuspense = withLazyLoading(LazyLocationManager, {
  fallback: <ComponentLoadingFallback />,
  componentName: 'LocationManager',
});

// ============================================================================
// PRELOADING HOOKS AND UTILITIES
// ============================================================================

// Enhanced preload hook with role-based loading
export const usePreloadComponents = (userRole: 'admin' | 'employee' | 'guest') => {
  React.useEffect(() => {
    const preloadTimer = setTimeout(() => {
      switch (userRole) {
        case 'admin':
          // Preload admin-specific components
          Promise.all([
            import('../pages/AdminDashboard'),
            import('../pages/EmployeeDetailsPage'),
            import('../components/TeamManager'),
            import('../components/PerformanceDashboard'),
          ]).catch(error => console.warn('Admin preload failed:', error));
          break;

        case 'employee':
          // Preload employee-specific components
          Promise.all([
            import('../pages/EmployeeDashboard'),
            import('../components/LeaveManagement'),
            import('../components/LeaveRequestsManagement'),
          ]).catch(error => console.warn('Employee preload failed:', error));
          break;

        case 'guest':
          // Preload authentication pages
          Promise.all([
            import('../pages/RegisterPage'),
            import('../pages/ForgotPasswordPage'),
          ]).catch(error => console.warn('Guest preload failed:', error));
          break;
      }
    }, 1000); // Delay to avoid blocking initial render

    return () => clearTimeout(preloadTimer);
  }, [userRole]);
};

// Export usePrefetchComponent for external use
export { usePrefetchComponent };
