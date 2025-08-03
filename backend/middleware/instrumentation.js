const tracer = require('../config/datadog');
const { performance } = require('perf_hooks');

/**
 * Custom instrumentation utilities for Attendance Dashboard
 */
class AttendanceInstrumentation {
  constructor() {
    this.customMetrics = {};
    this.performanceMarks = new Map();
  }

  /**
   * Create a custom span for business logic
   */
  createSpan(operationName, options = {}) {
    const span = tracer.startSpan(operationName, {
      tags: {
        'span.type': 'custom',
        'service.name': 'attendance-dashboard-api',
        ...options.tags,
      },
      ...options,
    });

    return span;
  }

  /**
   * Instrument attendance-specific operations
   */
  instrumentAttendanceOperation(operationName, operation) {
    return async (...args) => {
      const span = this.createSpan(`attendance.${operationName}`, {
        tags: {
          'attendance.operation': operationName,
          'attendance.args_count': args.length,
        },
      });

      try {
        const startTime = performance.now();
        const result = await operation(...args);
        const endTime = performance.now();

        span.setTag('attendance.duration_ms', endTime - startTime);
        span.setTag('attendance.success', true);

        if (result) {
          span.setTag('attendance.result_type', typeof result);
          if (Array.isArray(result)) {
            span.setTag('attendance.result_count', result.length);
          }
        }

        span.finish();
        return result;
      } catch (error) {
        span.setTag('attendance.success', false);
        span.setTag('attendance.error', error.message);
        span.setTag('error', true);
        span.finish();
        throw error;
      }
    };
  }

  /**
   * Instrument database queries with detailed metrics
   */
  instrumentDatabaseQuery(queryName, query) {
    return async (...args) => {
      const span = this.createSpan(`db.query.${queryName}`, {
        tags: {
          'db.operation': queryName,
          'db.type': 'postgresql',
        },
      });

      const startTime = performance.now();

      try {
        const result = await query(...args);
        const endTime = performance.now();

        span.setTag('db.duration_ms', endTime - startTime);
        span.setTag('db.success', true);

        if (result && result.rows) {
          span.setTag('db.rows_returned', result.rows.length);
        }

        if (result && result.rowCount !== undefined) {
          span.setTag('db.rows_affected', result.rowCount);
        }

        span.finish();
        return result;
      } catch (error) {
        const endTime = performance.now();

        span.setTag('db.duration_ms', endTime - startTime);
        span.setTag('db.success', false);
        span.setTag('db.error', error.message);
        span.setTag('error', true);

        span.finish();
        throw error;
      }
    };
  }

  /**
   * Instrument Redis operations
   */
  instrumentRedisOperation(operationName, operation) {
    return async (...args) => {
      const span = this.createSpan(`redis.${operationName}`, {
        tags: {
          'redis.operation': operationName,
          'redis.key': args[0] || 'unknown',
        },
      });

      try {
        const startTime = performance.now();
        const result = await operation(...args);
        const endTime = performance.now();

        span.setTag('redis.duration_ms', endTime - startTime);
        span.setTag('redis.success', true);

        if (typeof result === 'string' || Array.isArray(result)) {
          span.setTag('redis.result_size', result.length);
        }

        span.finish();
        return result;
      } catch (error) {
        span.setTag('redis.success', false);
        span.setTag('redis.error', error.message);
        span.setTag('error', true);
        span.finish();
        throw error;
      }
    };
  }

  /**
   * Track custom business metrics
   */
  trackMetric(name, value, tags = {}) {
    const span = tracer.scope().active();
    if (span) {
      span.setTag(`custom.${name}`, value);
      Object.entries(tags).forEach(([key, val]) => {
        span.setTag(key, val);
      });
    }

    // Store for batch sending
    this.customMetrics[name] = { value, tags, timestamp: Date.now() };
  }

  /**
   * Track performance marks for detailed timing
   */
  markPerformanceStart(name) {
    this.performanceMarks.set(name, performance.now());
  }

  markPerformanceEnd(name, tags = {}) {
    const startTime = this.performanceMarks.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.trackMetric(`performance.${name}`, duration, {
        ...tags,
        unit: 'milliseconds',
      });
      this.performanceMarks.delete(name);
    }
  }

  /**
   * Middleware for Express route instrumentation
   */
  instrumentExpressRoute(routeName) {
    return (req, res, next) => {
      const span = tracer.scope().active();

      if (span) {
        span.setTag('express.route_name', routeName);
        span.setTag('express.request_size', req.get('content-length') || 0);

        // Track response
        const originalSend = res.send;
        res.send = function (data) {
          span.setTag(
            'express.response_size',
            Buffer.isBuffer(data)
              ? data.length
              : typeof data === 'string'
              ? data.length
              : JSON.stringify(data).length
          );
          span.setTag('express.status_code', res.statusCode);
          return originalSend.call(this, data);
        };
      }

      next();
    };
  }

  /**
   * Instrument file upload operations
   */
  instrumentFileUpload(uploadType) {
    return async (files, options = {}) => {
      const span = this.createSpan(`file.upload.${uploadType}`, {
        tags: {
          'file.upload_type': uploadType,
          'file.count': Array.isArray(files) ? files.length : 1,
        },
      });

      try {
        let totalSize = 0;
        if (Array.isArray(files)) {
          totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        } else if (files && files.size) {
          totalSize = files.size;
        }

        span.setTag('file.total_size_bytes', totalSize);
        span.setTag('file.total_size_mb', (totalSize / (1024 * 1024)).toFixed(2));

        const startTime = performance.now();
        // File processing would happen here
        const endTime = performance.now();

        span.setTag('file.processing_duration_ms', endTime - startTime);
        span.setTag('file.success', true);

        span.finish();
        return { success: true, totalSize, processingTime: endTime - startTime };
      } catch (error) {
        span.setTag('file.success', false);
        span.setTag('file.error', error.message);
        span.setTag('error', true);
        span.finish();
        throw error;
      }
    };
  }

  /**
   * Get current trace ID for correlation
   */
  getCurrentTraceId() {
    const span = tracer.scope().active();
    return span ? span.context().toTraceId() : null;
  }

  /**
   * Get current span ID for correlation
   */
  getCurrentSpanId() {
    const span = tracer.scope().active();
    return span ? span.context().toSpanId() : null;
  }

  /**
   * Add user context to current span
   */
  setUserContext(user) {
    const span = tracer.scope().active();
    if (span && user) {
      span.setTag('user.id', user.id);
      span.setTag('user.email', user.email);
      span.setTag('user.role', user.role);
      span.setTag('user.department', user.department);
      span.setTag('user.is_admin', user.isAdmin || false);
    }
  }

  /**
   * Add error context to current span
   */
  recordError(error, context = {}) {
    const span = tracer.scope().active();
    if (span) {
      span.setTag('error', true);
      span.setTag('error.msg', error.message);
      span.setTag('error.type', error.name || error.constructor.name);
      span.setTag('error.stack', error.stack);

      Object.entries(context).forEach(([key, value]) => {
        span.setTag(`error.context.${key}`, value);
      });
    }
  }

  /**
   * Create a distributed trace context for frontend correlation
   */
  createFrontendTraceContext() {
    const span = tracer.scope().active();
    if (span) {
      const traceId = span.context().toTraceId();
      const spanId = span.context().toSpanId();

      return {
        traceId,
        spanId,
        timestamp: Date.now(),
        service: 'attendance-dashboard-api',
      };
    }
    return null;
  }

  /**
   * Batch send custom metrics (called periodically)
   */
  flushCustomMetrics() {
    const metrics = Object.entries(this.customMetrics).map(([name, data]) => ({
      metric: `attendance.${name}`,
      value: data.value,
      tags: data.tags,
      timestamp: data.timestamp,
    }));

    // Clear the metrics after sending
    this.customMetrics = {};

    return metrics;
  }
}

// Export singleton instance
const instrumentation = new AttendanceInstrumentation();
module.exports = instrumentation;
