// Datadog APM (Application Performance Monitoring) Configuration
// This must be imported before any other modules to properly instrument them

require('dd-trace').init({
  // Environment configuration
  env: process.env.NODE_ENV || 'development',
  service: 'attendance-dashboard-api',
  version: process.env.npm_package_version || '1.0.0',

  // Datadog agent configuration
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: process.env.DD_AGENT_PORT || 8126,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Logging configuration
  logInjection: true, // Inject trace IDs into logs
  logger: {
    level: process.env.DD_LOG_LEVEL || 'warn',
  },

  // Profiling (CPU and memory)
  profiling: {
    enabled: process.env.DD_PROFILING_ENABLED === 'true',
    sourceMap: true,
    exporters: 'agent',
  },

  // Runtime metrics
  runtimeMetrics: true,

  // Plugin configuration for automatic instrumentation
  plugins: {
    // HTTP server instrumentation
    http: {
      enabled: true,
      headers: [], // Disable header collection to reduce header size
      hooks: {
        request: (span, req) => {
          // Only add essential tags to reduce header size
          if (req.route?.path) {
            span.setTag('http.route', req.route.path);
          }
        },
      },
    },

    // Express.js instrumentation
    express: {
      enabled: true,
      headers: [], // Disable header collection to reduce header size
      hooks: {
        request: (span, req) => {
          // Only add essential tags
          span.setTag('express.method', req.method);
        },
      },
    },

    // PostgreSQL instrumentation
    pg: {
      enabled: true,
      service: 'attendance-dashboard-postgres',
      hooks: {
        query: (span, query) => {
          // Add database query information
          span.setTag('db.statement', query.text?.substring(0, 100) + '...' || 'unknown');
          span.setTag('db.rows_affected', query.rowCount || 0);
        },
      },
    },

    // Redis instrumentation
    redis: {
      enabled: true,
      service: 'attendance-dashboard-redis',
    },

    // Socket.IO instrumentation
    'socket.io': {
      enabled: true,
      service: 'attendance-dashboard-websocket',
    },

    // File system operations
    fs: {
      enabled: true,
    },

    // DNS resolution
    dns: {
      enabled: true,
    },

    // Crypto operations
    crypto: {
      enabled: true,
    },
  },

  // Sampling configuration
  sampling: {
    // Sample 100% in development, adjust for production
    rate: process.env.DD_TRACE_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
  },

  // Tag configuration
  tags: {
    team: 'backend',
    component: 'api-server',
    datacenter: process.env.DATACENTER || 'local',
    'instance.id': process.env.INSTANCE_ID || require('os').hostname(),
    'git.commit.sha': process.env.GIT_COMMIT_SHA || 'unknown',
    'build.number': process.env.BUILD_NUMBER || 'dev',
  },

  // URL blacklisting (don't trace these endpoints)
  blacklist: ['/health', '/metrics', '/ping', '/favicon.ico', '/api/build-info'],

  // Custom span hooks
  hooks: {
    'express:request': (span, req) => {
      // Add user context if available
      if (req.user) {
        span.setTag('user.id', req.user.id);
        span.setTag('user.role', req.user.role);
        span.setTag('user.department', req.user.department);
      }

      // Add request context
      span.setTag('request.ip', req.ip || req.connection.remoteAddress);
      span.setTag('request.user_agent', req.get('User-Agent'));
      span.setTag('request.referer', req.get('Referer'));
    },
  },
});

// Export the tracer instance for custom instrumentation
module.exports = require('dd-trace');
