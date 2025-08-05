/**
 * Cache busting utilities for the React application
 */

// Get build information from meta tags or environment
export const getBuildInfo = () => {
  const buildHashMeta = document.querySelector('meta[name="build-hash"]');
  const buildTimeMeta = document.querySelector('meta[name="build-time"]');

  return {
    hash: buildHashMeta?.getAttribute('content') || process.env.REACT_APP_BUILD_HASH || 'dev',
    time:
      buildTimeMeta?.getAttribute('content') ||
      process.env.REACT_APP_BUILD_TIME ||
      new Date().toISOString(),
    version: process.env.REACT_APP_VERSION || '1.0.0',
  };
};

// Create a cache-busted URL
export const createCacheBustedUrl = (url: string, params: Record<string, string> = {}) => {
  const buildInfo = getBuildInfo();
  const urlObj = new URL(url, window.location.origin);

  // Add build hash as cache buster
  urlObj.searchParams.set('v', buildInfo.hash);

  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  return urlObj.toString();
};

// Asset versioning for dynamic imports
export const getVersionedAssetUrl = (assetPath: string) => {
  const buildInfo = getBuildInfo();

  // If asset already has a hash, return as-is
  if (/\.[0-9a-f]{8,}\.[a-z]+$/i.test(assetPath)) {
    return assetPath;
  }

  // Add version parameter for non-hashed assets
  const separator = assetPath.includes('?') ? '&' : '?';
  return `${assetPath}${separator}v=${buildInfo.hash}`;
};

// Service worker cache busting
export const invalidateServiceWorkerCache = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    for (const registration of registrations) {
      await registration.unregister();
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    console.log('Service worker cache invalidated');
  }
};

// Check for app updates
export const checkForAppUpdate = async () => {
  const buildInfo = getBuildInfo();

  try {
    // Get API base URL (same as used in api.ts)
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
    
    // Fetch current build info from server
    const response = await fetch(`${API_BASE_URL}/build-info`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      const serverBuildInfo = await response.json();

      // Compare build hashes
      if (serverBuildInfo.hash !== buildInfo.hash) {
        return {
          updateAvailable: true,
          currentVersion: buildInfo.hash,
          newVersion: serverBuildInfo.hash,
          releaseNotes: serverBuildInfo.releaseNotes,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to check for app updates:', error);
  }

  return {
    updateAvailable: false,
    currentVersion: buildInfo.hash,
  };
};

// Force app refresh with cache clearing
export const forceAppRefresh = async () => {
  await invalidateServiceWorkerCache();
  window.location.reload();
};

// Cache status utilities
export const getCacheStatus = () => {
  const performance = window.performance;
  const navigationEntry = performance.getEntriesByType(
    'navigation'
  )[0] as PerformanceNavigationTiming;

  return {
    cacheHit:
      navigationEntry?.transferSize === 0 ||
      navigationEntry?.transferSize < navigationEntry?.encodedBodySize,
    transferSize: navigationEntry?.transferSize || 0,
    encodedBodySize: navigationEntry?.encodedBodySize || 0,
    decodedBodySize: navigationEntry?.decodedBodySize || 0,
  };
};

// Display cache information in console (development only)
export const logCacheInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    const buildInfo = getBuildInfo();
    const cacheStatus = getCacheStatus();

    console.group('🗄️ Cache Information');
    console.log('Build Hash:', buildInfo.hash);
    console.log('Build Time:', buildInfo.time);
    console.log('Version:', buildInfo.version);
    console.log('Cache Hit:', cacheStatus.cacheHit);
    console.log('Transfer Size:', `${(cacheStatus.transferSize / 1024).toFixed(2)} KB`);
    console.log('Encoded Size:', `${(cacheStatus.encodedBodySize / 1024).toFixed(2)} KB`);
    console.log('Decoded Size:', `${(cacheStatus.decodedBodySize / 1024).toFixed(2)} KB`);
    console.groupEnd();
  }
};

export default {
  getBuildInfo,
  createCacheBustedUrl,
  getVersionedAssetUrl,
  invalidateServiceWorkerCache,
  checkForAppUpdate,
  forceAppRefresh,
  getCacheStatus,
  logCacheInfo,
};
