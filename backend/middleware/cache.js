const { cacheService, CacheKeys } = require('../config/redis');

// Cache middleware for API responses
const cacheMiddleware = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    try {
      // Check if force refresh is requested
      const forceRefresh = req.query.force === 'true' || req.query.force === true || req.body.force === true;
      
      if (forceRefresh) {
        console.log('🔄 Cache BYPASS requested via force parameter');
        next();
        return;
      }

      // Generate cache key based on request
      const cacheKey = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : keyGenerator;

      // Try to get cached response
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        console.log(`🚀 Cache HIT for key: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`💾 Cache MISS for key: ${cacheKey}`);

      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(data) {
        // Cache the response data
        cacheService.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error in middleware:', err);
        });

        // Call original res.json
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Invalidate cache middleware
const invalidateCacheMiddleware = (patterns) => {
  return async (req, res, next) => {
    try {
      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to invalidate cache after successful response
      res.json = function(data) {
        // Only invalidate cache for successful responses
        if (res.statusCode < 400) {
          // Invalidate cache patterns
          const invalidatePatterns = Array.isArray(patterns) ? patterns : [patterns];
          
          invalidatePatterns.forEach(async (pattern) => {
            try {
              const cachePattern = typeof pattern === 'function' 
                ? pattern(req, data) 
                : pattern;
              
              await cacheService.delPattern(cachePattern);
              console.log(`🗑️ Cache invalidated for pattern: ${cachePattern}`);
            } catch (err) {
              console.error('Cache invalidation error:', err);
            }
          });
        }

        // Call original res.json
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation middleware error:', error);
      next();
    }
  };
};

// Specific cache middleware for common endpoints
const attendanceStatsCache = (ttl = 1800) => { // 30 minutes
  return cacheMiddleware((req) => {
    const userId = req.user?.id;
    const period = req.query?.period || '30';
    return CacheKeys.attendanceStats(userId, period);
  }, ttl);
};

const attendanceCalendarCache = (ttl = 3600) => { // 1 hour
  return (req, res, next) => {
    // Skip cache if force parameter is true
    if (req.query.force === 'true' || req.query.force === true) {
      console.log('🔄 Calendar Cache BYPASS requested via force parameter');
      return next();
    }
    
    // Use normal cache middleware
    return cacheMiddleware((req) => {
      const userId = req.user?.id;
      const month = req.query?.month || new Date().getMonth() + 1;
      const year = req.query?.year || new Date().getFullYear();
      return CacheKeys.attendanceCalendar(userId, month, year);
    }, ttl)(req, res, next);
  };
};

const leaveRequestsCache = (ttl = 1800) => { // 30 minutes
  return (req, res, next) => {
    // Skip cache if force parameter is true
    if (req.query.force === 'true') {
      console.log('🔄 Cache BYPASS requested via force parameter');
      return next();
    }
    
    // Use normal cache middleware with query parameters in cache key
    return cacheMiddleware((req) => {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status = '', year = '' } = req.query;
      return `${CacheKeys.leaveRequests(userId)}:${page}:${limit}:${status}:${year}`;
    }, ttl)(req, res, next);
  };
};

const employeesCache = (ttl = 3600) => { // 1 hour
  return cacheMiddleware(() => CacheKeys.employees(), ttl);
};

const holidaysCache = (ttl = 86400) => { // 24 hours
  return cacheMiddleware((req) => {
    const year = req.query?.year || new Date().getFullYear();
    return CacheKeys.holidays(year);
  }, ttl);
};

// Cache invalidation patterns
const invalidateUserCache = (userId) => [
  CacheKeys.user(userId),
  CacheKeys.userProfile(userId),
  `${CacheKeys.attendanceStats(userId, '*')}`,
  `${CacheKeys.attendanceCalendar(userId, '*', '*')}`,
  `${CacheKeys.leaveRequests(userId)}*`,
  `${CacheKeys.leaveBalance(userId)}*`
];

const invalidateAttendanceCache = () => [
  'stats:*',
  'calendar:*',
  'records:*',
  'analytics:*'
];

const invalidateLeaveCache = () => [
  'leave:*',
  'analytics:*'
];

const invalidateEmployeeCache = () => [
  'employees:*',
  'employee:*',
  'team:*'
];

// Rate limiting with Redis
const rateLimitMiddleware = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const endpoint = req.route?.path || req.path;
      const key = CacheKeys.rateLimit(ip, endpoint);
      
      const current = await cacheService.incr(key, Math.ceil(windowMs / 1000));
      
      if (current > maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
          retryAfter: windowMs / 1000
        });
      }
      
      // Set headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs)
      });
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
};

// Session cache middleware
const sessionCacheMiddleware = async (req, res, next) => {
  try {
    if (req.sessionID) {
      const sessionKey = CacheKeys.userSession(req.sessionID);
      const cachedSession = await cacheService.get(sessionKey);
      
      if (cachedSession) {
        req.cachedSession = cachedSession;
      }
    }
    next();
  } catch (error) {
    console.error('Session cache middleware error:', error);
    next();
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  attendanceStatsCache,
  attendanceCalendarCache,
  leaveRequestsCache,
  employeesCache,
  holidaysCache,
  invalidateUserCache,
  invalidateAttendanceCache,
  invalidateLeaveCache,
  invalidateEmployeeCache,
  rateLimitMiddleware,
  sessionCacheMiddleware
};
