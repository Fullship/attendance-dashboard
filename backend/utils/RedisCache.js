const Redis = require('ioredis');

/**
 * Redis Cache Manager for expensive database operations
 * Provides caching layer with TTL, key management, and async/await support
 */
class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default TTL
    this.keyPrefix = 'attendance_dashboard:';

    this.connect();
  }

  /**
   * Initialize Redis connection with retry logic
   */
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        showFriendlyErrorStack: true,
      };

      this.client = new Redis(redisConfig);

      // Connection event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis cache connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', err => {
        console.warn('⚠️  Redis cache error (falling back to direct DB):', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('📴 Redis cache connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.client.ping();
      this.isConnected = true;
    } catch (error) {
      console.warn('⚠️  Redis cache unavailable (running without cache):', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix and namespace
   * @param {string} namespace - Cache namespace (e.g., 'attendance', 'users')
   * @param {string} key - Specific cache key
   * @returns {string} Full cache key
   */
  generateKey(namespace, key) {
    return `${this.keyPrefix}${namespace}:${key}`;
  }

  /**
   * Get value from cache
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null if not found
   */
  async get(namespace, key) {
    if (!this.isConnected) return null;

    try {
      const cacheKey = this.generateKey(namespace, key);
      const cached = await this.client.get(cacheKey);

      if (cached) {
        console.log(`🎯 Cache HIT: ${namespace}:${key}`);
        return JSON.parse(cached);
      }

      console.log(`💨 Cache MISS: ${namespace}:${key}`);
      return null;
    } catch (error) {
      console.warn(`⚠️  Cache GET error for ${namespace}:${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(namespace, key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return;

    try {
      const cacheKey = this.generateKey(namespace, key);
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await this.client.setex(cacheKey, ttl, serialized);
      } else {
        await this.client.set(cacheKey, serialized);
      }

      console.log(`💾 Cache SET: ${namespace}:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.warn(`⚠️  Cache SET error for ${namespace}:${key}:`, error.message);
    }
  }

  /**
   * Delete specific cache key
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   */
  async del(namespace, key) {
    if (!this.isConnected) return;

    try {
      const cacheKey = this.generateKey(namespace, key);
      await this.client.del(cacheKey);
      console.log(`🗑️  Cache DEL: ${namespace}:${key}`);
    } catch (error) {
      console.warn(`⚠️  Cache DEL error for ${namespace}:${key}:`, error.message);
    }
  }

  /**
   * Clear all cache keys matching pattern
   * @param {string} pattern - Redis key pattern (e.g., "attendance:*")
   */
  async clear(pattern) {
    if (!this.isConnected) return;

    try {
      const fullPattern = `${this.keyPrefix}${pattern}`;
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`🧹 Cache CLEAR: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      console.warn(`⚠️  Cache CLEAR error for pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Wrapper for database queries with automatic caching
   * @param {string} namespace - Cache namespace
   * @param {string} key - Cache key
   * @param {Function} dbQuery - Async function that returns database result
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<any>} Result from cache or database
   */
  async wrapQuery(namespace, key, dbQuery, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cached = await this.get(namespace, key);
    if (cached !== null) {
      return cached;
    }

    // Execute database query
    console.log(`🔍 Executing DB query for ${namespace}:${key}`);
    const startTime = Date.now();

    try {
      const result = await dbQuery();
      const duration = Date.now() - startTime;

      // Cache the result
      await this.set(namespace, key, result, ttl);

      console.log(`✅ DB query completed in ${duration}ms for ${namespace}:${key}`);
      return result;
    } catch (error) {
      console.error(`❌ DB query failed for ${namespace}:${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false, message: 'Redis cache unavailable' };
    }

    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbsize();

      // Parse memory info
      const memoryLines = info.split('\r\n');
      const memoryInfo = {};
      memoryLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          memoryInfo[key] = value;
        }
      });

      return {
        connected: true,
        keyCount,
        memoryUsed: memoryInfo.used_memory_human || 'Unknown',
        memoryPeak: memoryInfo.used_memory_peak_human || 'Unknown',
        hits: await this.client.info('stats').then(stats => {
          const match = stats.match(/keyspace_hits:(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
        misses: await this.client.info('stats').then(stats => {
          const match = stats.match(/keyspace_misses:(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<boolean>} Connection status
   */
  async healthCheck() {
    if (!this.isConnected) return false;

    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      console.warn('⚠️  Redis health check failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('👋 Redis cache disconnected');
    }
  }
}

// Export singleton instance
module.exports = new RedisCache();
