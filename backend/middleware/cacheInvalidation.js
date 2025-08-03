const dbCache = require('../utils/DatabaseCache');

/**
 * Middleware to invalidate relevant caches after data modifications
 * Use this after routes that create, update, or delete data
 */

/**
 * Invalidate attendance-related caches
 */
const invalidateAttendanceCache = async (req, res, next) => {
  // Store the original res.json method
  const originalJson = res.json;

  // Override res.json to invalidate cache after successful response
  res.json = function (data) {
    // Only invalidate cache for successful operations (not error responses)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Async cache invalidation (don't wait for it)
      dbCache
        .invalidateCache(['attendance_records', 'dashboard_stats'])
        .catch(err => console.warn('Cache invalidation error:', err.message));
    }

    // Call the original res.json
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Invalidate user-related caches
 */
const invalidateUserCache = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      dbCache
        .invalidateCache(['users', 'attendance_records', 'dashboard_stats'])
        .catch(err => console.warn('Cache invalidation error:', err.message));
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Invalidate leave request-related caches
 */
const invalidateLeaveRequestCache = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      dbCache
        .invalidateCache(['leave_requests', 'dashboard_stats'])
        .catch(err => console.warn('Cache invalidation error:', err.message));
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Invalidate clock request-related caches
 */
const invalidateClockRequestCache = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      dbCache
        .invalidateCache(['clock_requests', 'dashboard_stats'])
        .catch(err => console.warn('Cache invalidation error:', err.message));
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Invalidate all caches (use sparingly, for major data changes)
 */
const invalidateAllCache = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      dbCache
        .invalidateCache([
          'attendance_records',
          'users',
          'leave_requests',
          'clock_requests',
          'dashboard_stats',
          'analytics',
        ])
        .catch(err => console.warn('Cache invalidation error:', err.message));
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  invalidateAttendanceCache,
  invalidateUserCache,
  invalidateLeaveRequestCache,
  invalidateClockRequestCache,
  invalidateAllCache,
};
