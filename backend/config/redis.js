const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keyPrefix: 'attendance:',
};

// Create Redis instance
const redis = new Redis(redisConfig);

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for operations');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Cache utility functions
class CacheService {
  constructor() {
    this.redis = redis;
    this.defaultTTL = 3600; // 1 hour
  }

  // Set cache with TTL
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        return await this.redis.setex(key, ttl, serializedValue);
      }
      return await this.redis.set(key, serializedValue);
    } catch (error) {
      console.error('Cache set error:', error);
      return null;
    }
  }

  // Get cache value
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache key
  async del(key) {
    try {
      return await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return null;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return null;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      return await this.redis.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Set TTL for existing key
  async expire(key, ttl) {
    try {
      return await this.redis.expire(key, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  // Get TTL for key
  async ttl(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Increment counter
  async incr(key, ttl = this.defaultTTL) {
    try {
      const result = await this.redis.incr(key);
      if (result === 1 && ttl) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return null;
    }
  }

  // Decrement counter
  async decr(key) {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      console.error('Cache decrement error:', error);
      return null;
    }
  }

  // Add to set
  async sadd(key, ...members) {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      console.error('Cache set add error:', error);
      return null;
    }
  }

  // Get set members
  async smembers(key) {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      console.error('Cache set members error:', error);
      return [];
    }
  }

  // Remove from set
  async srem(key, ...members) {
    try {
      return await this.redis.srem(key, ...members);
    } catch (error) {
      console.error('Cache set remove error:', error);
      return null;
    }
  }

  // Hash operations
  async hset(key, field, value) {
    try {
      const serializedValue = JSON.stringify(value);
      return await this.redis.hset(key, field, serializedValue);
    } catch (error) {
      console.error('Cache hash set error:', error);
      return null;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hash get error:', error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.redis.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      console.error('Cache hash get all error:', error);
      return {};
    }
  }

  async hdel(key, ...fields) {
    try {
      return await this.redis.hdel(key, ...fields);
    } catch (error) {
      console.error('Cache hash delete error:', error);
      return null;
    }
  }

  // Flush all cache
  async flushall() {
    try {
      return await this.redis.flushall();
    } catch (error) {
      console.error('Cache flush error:', error);
      return null;
    }
  }

  // Get Redis info
  async info() {
    try {
      return await this.redis.info();
    } catch (error) {
      console.error('Cache info error:', error);
      return null;
    }
  }

  // Ping Redis connection
  async ping() {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  // Get memory usage
  async getMemoryUsage() {
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      const usedMemoryLine = lines.find(line => line.startsWith('used_memory:'));
      const usedMemory = usedMemoryLine ? parseInt(usedMemoryLine.split(':')[1]) : 0;
      
      return {
        used: usedMemory,
        formatted: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      console.error('Redis memory usage error:', error);
      return { used: 0, formatted: '0 MB' };
    }
  }

  // Close Redis connection
  async disconnect() {
    try {
      await this.redis.disconnect();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

// Create cache service instance
const cacheService = new CacheService();

// Cache key generators
const CacheKeys = {
  // User caches
  user: (id) => `user:${id}`,
  userProfile: (id) => `user:profile:${id}`,
  userSession: (sessionId) => `session:${sessionId}`,
  
  // Attendance caches
  attendanceStats: (userId, period) => `stats:${userId}:${period}`,
  attendanceCalendar: (userId, month, year) => `calendar:${userId}:${month}:${year}`,
  attendanceRecords: (userId, startDate = '', endDate = '', page = 1) => `records:${userId}:${startDate}:${endDate}:${page}`,
  
  // Leave request caches
  leaveRequests: (userId) => `leave:requests:${userId}`,
  leaveRequestsAdmin: () => `leave:requests:admin`,
  leaveBalance: (userId) => `leave:balance:${userId}`,
  
  // Clock request caches
  clockRequests: () => `clock:requests`,
  clockRequestsUser: (userId) => `clock:requests:${userId}`,
  
  // Employee caches
  employees: () => `employees:all`,
  employeeDetails: (id) => `employee:${id}`,
  employeeTeam: (teamId) => `team:${teamId}:employees`,
  
  // Settings caches
  holidays: (year) => `holidays:${year}`,
  attendanceRules: () => `settings:attendance:rules`,
  
  // Rate limiting
  rateLimit: (ip, endpoint) => `ratelimit:${ip}:${endpoint}`,
  
  // Analytics
  dailyStats: (date) => `analytics:daily:${date}`,
  monthlyStats: (month, year) => `analytics:monthly:${month}:${year}`,
};

module.exports = {
  redis,
  cacheService,
  CacheKeys,
  CacheService
};
