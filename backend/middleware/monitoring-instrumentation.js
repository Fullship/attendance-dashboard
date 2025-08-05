/**
 * Comprehensive monitoring instrumentation middleware
 * Integrates Datadog APM, Redis counters, and custom metrics collection
 */

const cluster = require('cluster');
const { cacheService } = require('../config/redis');

class MonitoringInstrumentation {
  constructor() {
    // In-memory metrics store
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatus: new Map()
      },
      performance: {
        totalResponseTime: 0,
        slowRequests: 0,
        errorCount: 0,
        startTime: Date.now()
      },
      cache: {
        hits: 0,
        misses: 0,
        operations: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        totalQueryTime: 0
      },
      system: {
        memoryAlerts: 0,
        cpuAlerts: 0,
        lastMemoryCheck: Date.now()
      }
    };

    // Alert thresholds
    this.thresholds = {
      responseTime: 1000, // ms
      memoryUsage: 0.8, // 80%
      cpuUsage: 80, // %
      errorRate: 0.05 // 5%
    };

    // Setup periodic monitoring
    this.setupPeriodicMonitoring();
  }

  /**
   * Main request instrumentation middleware
   */
  requestInstrumentation() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalEnd = res.end;

      // Track request
      this.trackRequest(req);

      // Override response end to capture metrics
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        
        // Track response metrics
        this.trackResponse(req, res, responseTime);
        
        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Track incoming request
   */
  trackRequest(req) {
    this.metrics.requests.total++;
    
    // Track by endpoint
    const endpoint = this.normalizeEndpoint(req.path);
    this.incrementMap(this.metrics.requests.byEndpoint, endpoint);
    
    // Track by method
    this.incrementMap(this.metrics.requests.byMethod, req.method);
  }

  /**
   * Track response metrics
   */
  trackResponse(req, res, responseTime) {
    // Track response time
    this.metrics.performance.totalResponseTime += responseTime;
    
    // Track slow requests
    if (responseTime > this.thresholds.responseTime) {
      this.metrics.performance.slowRequests++;
      this.logSlowRequest(req, responseTime);
    }
    
    // Track by status code
    const statusGroup = `${Math.floor(res.statusCode / 100)}xx`;
    this.incrementMap(this.metrics.requests.byStatus, statusGroup);
    
    // Track errors
    if (res.statusCode >= 400) {
      this.metrics.performance.errorCount++;
      this.logError(req, res);
    }
  }

  /**
   * Cache operation instrumentation
   */
  instrumentCacheOperation(operation, hit = null) {
    this.metrics.cache.operations++;
    
    if (hit === true) {
      this.metrics.cache.hits++;
    } else if (hit === false) {
      this.metrics.cache.misses++;
    }
  }

  /**
   * Database query instrumentation
   */
  instrumentDatabaseQuery(duration, isSlowQuery = false) {
    this.metrics.database.queries++;
    this.metrics.database.totalQueryTime += duration;
    
    if (isSlowQuery) {
      this.metrics.database.slowQueries++;
    }
  }

  /**
   * Memory monitoring
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usageRatio = heapUsedMB / heapTotalMB;
    
    if (usageRatio > this.thresholds.memoryUsage) {
      this.metrics.system.memoryAlerts++;
      this.logMemoryAlert(heapUsedMB, heapTotalMB, usageRatio);
    }
    
    this.metrics.system.lastMemoryCheck = Date.now();
    
    return {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      external: memUsage.external / 1024 / 1024,
      rss: memUsage.rss / 1024 / 1024,
      usageRatio
    };
  }

  /**
   * Get aggregated metrics
   */
  getMetrics() {
    const now = Date.now();
    const uptime = (now - this.metrics.performance.startTime) / 1000;
    
    return {
      requests: {
        total: this.metrics.requests.total,
        perSecond: Math.round(this.metrics.requests.total / uptime),
        byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint),
        byMethod: Object.fromEntries(this.metrics.requests.byMethod),
        byStatus: Object.fromEntries(this.metrics.requests.byStatus)
      },
      performance: {
        averageResponseTime: this.metrics.requests.total > 0 ? 
          Math.round(this.metrics.performance.totalResponseTime / this.metrics.requests.total) : 0,
        slowRequestCount: this.metrics.performance.slowRequests,
        slowRequestRate: this.metrics.requests.total > 0 ? 
          (this.metrics.performance.slowRequests / this.metrics.requests.total) * 100 : 0,
        errorCount: this.metrics.performance.errorCount,
        errorRate: this.metrics.requests.total > 0 ? 
          (this.metrics.performance.errorCount / this.metrics.requests.total) * 100 : 0,
        uptime: Math.round(uptime)
      },
      cache: {
        operations: this.metrics.cache.operations,
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: this.metrics.cache.operations > 0 ? 
          Math.round((this.metrics.cache.hits / this.metrics.cache.operations) * 100) : 0
      },
      database: {
        totalQueries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        averageQueryTime: this.metrics.database.queries > 0 ? 
          Math.round(this.metrics.database.totalQueryTime / this.metrics.database.queries) : 0,
        slowQueryRate: this.metrics.database.queries > 0 ? 
          (this.metrics.database.slowQueries / this.metrics.database.queries) * 100 : 0
      },
      system: {
        memory: this.checkMemoryUsage(),
        memoryAlerts: this.metrics.system.memoryAlerts,
        cpuAlerts: this.metrics.system.cpuAlerts,
        process: {
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version,
          uptime: process.uptime()
        },
        cluster: {
          isMaster: cluster.isMaster,
          workerId: cluster.worker?.id || null,
          workerCount: cluster.isMaster ? Object.keys(cluster.workers || {}).length : 1
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        byStatus: new Map()
      },
      performance: {
        totalResponseTime: 0,
        slowRequests: 0,
        errorCount: 0,
        startTime: Date.now()
      },
      cache: {
        hits: 0,
        misses: 0,
        operations: 0
      },
      database: {
        queries: 0,
        slowQueries: 0,
        totalQueryTime: 0
      },
      system: {
        memoryAlerts: 0,
        cpuAlerts: 0,
        lastMemoryCheck: Date.now()
      }
    };
  }

  /**
   * Setup periodic monitoring checks
   */
  setupPeriodicMonitoring() {
    // Check memory every 30 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Log metrics summary every 5 minutes
    setInterval(() => {
      console.log('📊 Metrics Summary:', JSON.stringify(this.getMetrics(), null, 2));
    }, 300000);
  }

  /**
   * Utility methods
   */
  incrementMap(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  normalizeEndpoint(path) {
    // Normalize paths with IDs to reduce cardinality
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/[a-f0-9\-]{36}/g, '/:uuid'); // UUIDs
  }

  logSlowRequest(req, responseTime) {
    console.warn(`🐌 Slow request detected: ${req.method} ${req.path} took ${responseTime}ms`);
  }

  logError(req, res) {
    console.error(`❌ Error response: ${req.method} ${req.path} returned ${res.statusCode}`);
  }

  logMemoryAlert(heapUsed, heapTotal, ratio) {
    console.warn(`🚨 Memory alert: ${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB (${(ratio * 100).toFixed(1)}%)`);
  }

  /**
   * Integration with external monitoring services
   */
  async sendToDatadog(metrics) {
    try {
      // In a real implementation, you would send custom metrics to Datadog
      // using the datadog client or StatsD
      
      // Example:
      // const StatsD = require('node-statsd');
      // const statsd = new StatsD();
      // statsd.gauge('app.requests.total', metrics.requests.total);
      // statsd.gauge('app.performance.avg_response_time', metrics.performance.averageResponseTime);
      // statsd.gauge('app.cache.hit_rate', metrics.cache.hitRate);
      
      console.log('📈 Would send metrics to Datadog:', {
        'app.requests.total': metrics.requests.total,
        'app.performance.avg_response_time': metrics.performance.averageResponseTime,
        'app.cache.hit_rate': metrics.cache.hitRate,
        'app.memory.usage_mb': metrics.system.memory.heapUsed
      });
    } catch (error) {
      console.error('Failed to send metrics to Datadog:', error);
    }
  }

  async sendToRedis(metrics) {
    try {
      // Store current metrics in Redis for dashboard consumption
      await cacheService.setex('monitoring:metrics', 60, JSON.stringify(metrics));
      console.log('💾 Metrics stored in Redis cache');
    } catch (error) {
      console.error('Failed to store metrics in Redis:', error);
    }
  }

  /**
   * Health check method
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const memory = metrics.system.memory;
    
    const health = {
      status: 'healthy',
      checks: {
        memory: memory.usageRatio < this.thresholds.memoryUsage ? 'pass' : 'fail',
        errorRate: metrics.performance.errorRate < (this.thresholds.errorRate * 100) ? 'pass' : 'fail',
        responseTime: metrics.performance.averageResponseTime < this.thresholds.responseTime ? 'pass' : 'fail'
      },
      metrics: {
        responseTime: metrics.performance.averageResponseTime,
        errorRate: metrics.performance.errorRate,
        memoryUsage: memory.usageRatio * 100,
        uptime: metrics.performance.uptime
      },
      timestamp: new Date().toISOString()
    };

    // Determine overall health
    const failedChecks = Object.values(health.checks).filter(check => check === 'fail');
    if (failedChecks.length > 0) {
      health.status = failedChecks.length > 1 ? 'critical' : 'degraded';
    }

    return health;
  }
}

// Create singleton instance
const monitoringInstrumentation = new MonitoringInstrumentation();

module.exports = monitoringInstrumentation;
