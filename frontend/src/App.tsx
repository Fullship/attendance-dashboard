import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import LoadingSpinner from './components/LoadingSpinner';
import AppUpdateChecker from './components/AppUpdateChecker';
import { ReactPerformanceProfiler, PerformanceMetrics } from './utils/ReactPerformanceProfiler';
import { logCacheInfo } from './utils/cache-busting';
import { initializeDatadog } from './utils/datadog';
import { useDatadogPerformance } from './hooks/useDatadog';
import {
  LoginPageWithSuspense,
  RegisterPageWithSuspense,
  ForgotPasswordPageWithSuspense,
  ResetPasswordPageWithSuspense,
  EmployeeDashboardWithSuspense,
  AdminDashboardWithSuspense,
  EmployeeDetailsPageWithSuspense,
  PerformanceDashboardWithSuspense,
  LazyLoadingDemoWithSuspense,
  usePreloadComponents,
} from './components/LazyComponents';
import { DashboardLoadingFallback } from './components/LazyLoadingFallback';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Use preload hook for better performance
  usePreloadComponents(!isAuthenticated ? 'guest' : isAdmin ? 'admin' : 'employee');

  if (loading) {
    return <DashboardLoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Use preload hook for better performance
  usePreloadComponents(!isAuthenticated ? 'guest' : isAdmin ? 'admin' : 'employee');

  if (loading) {
    return <DashboardLoadingFallback />;
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  // Use Datadog performance monitoring
  const { trackPageLoad, trackError } = useDatadogPerformance();

  // Log cache information on app load
  useEffect(() => {
    logCacheInfo();
    trackPageLoad('app-initial-load');
  }, [trackPageLoad]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), {
        type: 'unhandled-promise-rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return (
    <ReactPerformanceProfiler id="AppContent" threshold={200}>
      <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <ReactPerformanceProfiler id="LoginPage" threshold={200}>
                    <LoginPageWithSuspense />
                  </ReactPerformanceProfiler>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <ReactPerformanceProfiler id="RegisterPage" threshold={200}>
                    <RegisterPageWithSuspense />
                  </ReactPerformanceProfiler>
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ReactPerformanceProfiler id="ForgotPasswordPage" threshold={200}>
                    <ForgotPasswordPageWithSuspense />
                  </ReactPerformanceProfiler>
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ReactPerformanceProfiler id="ResetPasswordPage" threshold={200}>
                    <ResetPasswordPageWithSuspense />
                  </ReactPerformanceProfiler>
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ReactPerformanceProfiler id="EmployeeDashboard" threshold={200}>
                    <EmployeeDashboardWithSuspense />
                  </ReactPerformanceProfiler>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <ReactPerformanceProfiler id="AdminDashboard" threshold={200}>
                    <AdminDashboardWithSuspense />
                  </ReactPerformanceProfiler>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employee/:id"
              element={
                <ProtectedRoute adminOnly>
                  <ReactPerformanceProfiler id="EmployeeDetailsPage" threshold={200}>
                    <EmployeeDetailsPageWithSuspense />
                  </ReactPerformanceProfiler>
                </ProtectedRoute>
              }
            />

            {/* Demo route for lazy loading showcase */}
            <Route
              path="/demo/lazy-loading"
              element={
                <ProtectedRoute>
                  <ReactPerformanceProfiler id="LazyLoadingDemo" threshold={200}>
                    <LazyLoadingDemoWithSuspense />
                  </ReactPerformanceProfiler>
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'dark:bg-gray-800 dark:text-white',
            }}
          />

          {/* Performance Metrics Overlay (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <Suspense fallback={null}>
              <PerformanceMetrics />
              <PerformanceDashboardWithSuspense />
            </Suspense>
          )}
      </div>
    </ReactPerformanceProfiler>
  );
};

function App() {
  // Initialize Datadog monitoring on app start
  useEffect(() => {
    initializeDatadog();
  }, []);

  return (
    <ReactPerformanceProfiler id="App" threshold={200}>
      <ThemeProvider>
        <ReactPerformanceProfiler id="ThemeProvider" threshold={200}>
          <AuthProvider>
            <ReactPerformanceProfiler id="AuthProvider" threshold={200}>
              <SocketProvider>
                <ReactPerformanceProfiler id="SocketProvider" threshold={200}>
                  <Router>
                    <AppContent />
                    <AppUpdateChecker />
                  </Router>
                </ReactPerformanceProfiler>
              </SocketProvider>
            </ReactPerformanceProfiler>
          </AuthProvider>
        </ReactPerformanceProfiler>
      </ThemeProvider>
    </ReactPerformanceProfiler>
  );
}

export default App;
