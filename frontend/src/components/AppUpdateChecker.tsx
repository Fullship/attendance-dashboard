import React, { useState, useEffect } from 'react';
import { checkForAppUpdate, forceAppRefresh } from '../utils/cache-busting';
import toast from 'react-hot-toast';

interface AppUpdateCheckerProps {
  checkInterval?: number; // Check interval in milliseconds
  autoCheck?: boolean;
}

export const AppUpdateChecker: React.FC<AppUpdateCheckerProps> = ({
  checkInterval = 60 * 60 * 1000, // 1 hour default (instead of 5 minutes)
  autoCheck = true,
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  const checkForUpdates = async () => {
    if (isChecking) return;

    // Debounce: Don't check more than once every 10 minutes
    const now = Date.now();
    if (now - lastCheckTime < 10 * 60 * 1000) {
      return;
    }

    setIsChecking(true);
    setLastCheckTime(now);
    
    try {
      const updateResult = await checkForAppUpdate();

      if (updateResult.updateAvailable) {
        // Check if we've already dismissed this version
        const dismissedVersion = localStorage.getItem('dismissed_app_version');
        if (dismissedVersion === updateResult.newVersion) {
          return;
        }

        setUpdateAvailable(true);
        setUpdateInfo(updateResult);

        // Show notification
        toast.success('New app version available!', {
          duration: 10000,
          icon: '🔄',
        });
      }
    } catch (error) {
      console.warn('Update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    toast.loading('Updating app...', { id: 'update-toast' });

    try {
      // Clear dismissed version before updating
      localStorage.removeItem('dismissed_app_version');
      await forceAppRefresh();
    } catch (error) {
      toast.error('Failed to update app. Please refresh manually.', { id: 'update-toast' });
    }
  };

  const dismissUpdate = () => {
    // Store the dismissed version so we don't show it again
    if (updateInfo?.newVersion) {
      localStorage.setItem('dismissed_app_version', updateInfo.newVersion);
    }
    setUpdateAvailable(false);
    setUpdateInfo(null);
  };

  useEffect(() => {
    if (!autoCheck) return;

    // Initial check after 2 minutes (give time for app to load)
    const initialTimer = setTimeout(checkForUpdates, 2 * 60 * 1000);

    // Periodic checks
    const intervalTimer = setInterval(checkForUpdates, checkInterval);

    // Check on window focus, but debounced
    let focusCheckTimeout: NodeJS.Timeout;
    const handleFocus = () => {
      clearTimeout(focusCheckTimeout);
      focusCheckTimeout = setTimeout(checkForUpdates, 30000); // 30 second delay after focus
    };
    window.addEventListener('focus', handleFocus);

    // Expose methods for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      (window as any).appUpdateChecker = {
        forceCheck: checkForUpdates,
        clearDismissed: () => localStorage.removeItem('dismissed_app_version'),
        getDismissed: () => localStorage.getItem('dismissed_app_version'),
      };
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      clearTimeout(focusCheckTimeout);
      window.removeEventListener('focus', handleFocus);
      
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).appUpdateChecker;
      }
    };
  }, [checkInterval, autoCheck]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <div className="text-blue-600 dark:text-blue-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            App Update Available
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            Version {updateInfo?.newVersion?.slice(0, 8)} is ready
          </p>
          {updateInfo?.releaseNotes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {updateInfo.releaseNotes}
            </p>
          )}

          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleUpdate}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={dismissUpdate}
              className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-md transition-colors"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={dismissUpdate}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AppUpdateChecker;
