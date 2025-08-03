import React, { useState, useEffect } from 'react';
import { checkForAppUpdate, forceAppRefresh } from '../utils/cache-busting';
import toast from 'react-hot-toast';

interface AppUpdateCheckerProps {
  checkInterval?: number; // Check interval in milliseconds
  autoCheck?: boolean;
}

export const AppUpdateChecker: React.FC<AppUpdateCheckerProps> = ({
  checkInterval = 5 * 60 * 1000, // 5 minutes default
  autoCheck = true,
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const updateResult = await checkForAppUpdate();

      if (updateResult.updateAvailable) {
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
      await forceAppRefresh();
    } catch (error) {
      toast.error('Failed to update app. Please refresh manually.', { id: 'update-toast' });
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
    setUpdateInfo(null);
  };

  useEffect(() => {
    if (!autoCheck) return;

    // Initial check after 10 seconds
    const initialTimer = setTimeout(checkForUpdates, 10000);

    // Periodic checks
    const intervalTimer = setInterval(checkForUpdates, checkInterval);

    // Check on window focus
    const handleFocus = () => {
      checkForUpdates();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', handleFocus);
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
