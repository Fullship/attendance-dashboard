/**
 * Server Worker Process
 * Contains the actual server code that runs in each worker process
 * Separated from cluster management for clean separation of concerns
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cluster = require('cluster');

require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Redis configuration
const { redis: redisClient, cacheService } = require('./config/redis');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const adminRoutes = require('./routes/admin');
const enhancedLeaveRoutes = require('./routes/enhanced-leave');
const adminLeaveRoutes = require('./routes/admin-leave');
const rolesRoutes = require('./routes/roles');

// Import database monitoring middleware
const DatabaseMonitoringAPI = require('./middleware/database-monitoring');

// Import monitoring instrumentation
const monitoringInstrumentation = require('./middleware/monitoring-instrumentation');
const profilingManager = require('./utils/ProfilingManager');

// Set global variables for health check
global.monitoringInstrumentation = monitoringInstrumentation;
global.profilingManager = profilingManager;
global.metricsEnabled = true;
global.performanceEnabled = true;

// Create router for database monitoring
const dbMonitoringRouter = require('express').Router();
const dbMonitoring = new DatabaseMonitoringAPI();

// Setup database monitoring routes
dbMonitoringRouter.get('/stats', (req, res) => dbMonitoring.getQueryStats(req, res));
dbMonitoringRouter.get('/slow-queries', (req, res) => dbMonitoring.getSlowQueries(req, res));
dbMonitoringRouter.get('/health', (req, res) => dbMonitoring.getDatabaseHealth(req, res));

const app = express();
const httpServer = createServer(app);

// Worker-specific configuration
const WORKER_ID = process.env.WORKER_ID || 'single';
const IS_CLUSTER_WORKER = process.env.CLUSTER_WORKER === 'true';
const BASE_PORT = parseInt(process.env.PORT) || 3002;

// Calculate worker-specific port if needed
const PORT = IS_CLUSTER_WORKER ? BASE_PORT : BASE_PORT;

// Worker identification middleware
app.use((req, res, next) => {
  res.setHeader('X-Worker-ID', WORKER_ID);
  res.setHeader('X-Worker-PID', process.pid);
  next();
});

// Initialize Socket.IO with cluster-compatible configuration
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',')
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3004',
            'http://localhost:3005',
          ];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Cluster-compatible Socket.IO configuration
  adapter: IS_CLUSTER_WORKER ? require('@socket.io/redis-adapter') : undefined,
});

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React webpack runtime
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// Monitoring instrumentation middleware (must be early in the chain)
app.use(monitoringInstrumentation.requestInstrumentation());

// Set additional global variables after Redis connection
global.redisCache = cacheService;
global.memoryMonitoring = true;

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',')
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3004',
            'http://localhost:3005',
          ];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept',
      'x-datadog-origin',
      'x-datadog-parent-id', 
      'x-datadog-sampling-priority',
      'x-datadog-trace-id',
      'x-requested-with',
      'user-agent',
      'cache-control',
      'pragma'
    ],
  })
);

// Rate limiting with cluster-aware configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_CLUSTER_WORKER ? 100 : 1000, // Adjust per worker
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Use Redis store for rate limiting in cluster mode
if (IS_CLUSTER_WORKER && redisClient) {
  try {
    const { default: RedisStore } = require('rate-limit-redis');
    rateLimitConfig.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    });
  } catch (error) {
    console.warn(`[Worker ${WORKER_ID}] Rate limit Redis store failed:`, error.message);
  }
}

app.use(rateLimit(rateLimitConfig));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration with cluster support
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Use Redis session store for cluster mode
if (IS_CLUSTER_WORKER && redisClient) {
  try {
    const RedisStore = require('connect-redis')(session);
    sessionConfig.store = new RedisStore({ client: redisClient });
  } catch (error) {
    console.warn(`[Worker ${WORKER_ID}] Session Redis store failed:`, error.message);
  }
}

app.use(session(sessionConfig));

// Health check endpoint with cluster info and monitoring status
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    worker: {
      id: WORKER_ID,
      pid: process.pid,
      clustered: IS_CLUSTER_WORKER,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    monitoring: {
      requestInstrumentation: !!global.monitoringInstrumentation,
      memoryMonitoring: !!global.memoryMonitoring,
      metricsCollection: !!global.metricsEnabled,
      profilingReady: !!global.profilingManager,
      instrumentationActive: process.env.MONITORING_ENABLED !== 'false',
      cachingEnabled: !!global.redisCache,
      performanceOptimized: !!global.performanceEnabled
    },
    cluster: IS_CLUSTER_WORKER ? {
      workerId: cluster.worker?.id,
      totalWorkers: process.env.CLUSTER_WORKERS || 'auto',
      restartCount: cluster.worker?.exitedAfterDisconnect ? 'restarted' : 'initial'
    } : null
  };

  res.json(health);
});

// Worker-specific status endpoint
app.get('/worker/status', (req, res) => {
  res.json({
    worker: {
      id: WORKER_ID,
      pid: process.pid,
      clustered: IS_CLUSTER_WORKER,
      port: PORT,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      cluster: cluster.isWorker
        ? {
            id: cluster.worker.id,
            isDead: cluster.worker.isDead(),
          }
        : null,
    },
    connections: {
      active: httpServer.listening ? 'listening' : 'not-listening',
      socketio: io.engine.clientsCount || 0,
    },
  });
});

// Database monitoring endpoints
app.use('/api/monitoring', dbMonitoringRouter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/enhanced-leave', enhancedLeaveRoutes);
app.use('/api/admin-leave', adminLeaveRoutes);
app.use('/api/roles', rolesRoutes);

// Build info endpoint for cache busting
app.get('/api/build-info', (req, res) => {
  res.json({
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    commit: process.env.GIT_COMMIT || 'development',
    worker: {
      id: WORKER_ID,
      pid: process.pid,
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Worker ${WORKER_ID}] Error:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    worker: {
      id: WORKER_ID,
      pid: process.pid,
    },
  });

  res.status(500).json({
    message: 'Something went wrong!',
    worker: WORKER_ID,
    error:
      process.env.NODE_ENV === 'development'
        ? {
            message: err.message,
            stack: err.stack,
          }
        : {},
  });
});

// Serve static files from React build (if frontend build exists)
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Handle React routing (SPA fallback) - must be before 404 handler
app.get('*', (req, res, next) => {
  // Skip API routes and other backend endpoints
  if (req.path.startsWith('/api/') || 
      req.path.startsWith('/health') || 
      req.path.startsWith('/socket.io/')) {
    return next();
  }
  
  // Try to serve the React app
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html doesn't exist, fall through to 404 handler
      next();
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    worker: WORKER_ID,
  });
});

// Socket.IO connection handling with cluster awareness
io.on('connection', socket => {
  console.log(`[Worker ${WORKER_ID}] User connected:`, socket.id);

  // Add worker info to socket
  socket.workerId = WORKER_ID;
  socket.workerPid = process.pid;

  socket.on('disconnect', () => {
    console.log(`[Worker ${WORKER_ID}] User disconnected:`, socket.id);
  });

  // Send worker info to client
  socket.emit('worker-info', {
    workerId: WORKER_ID,
    workerPid: process.pid,
    clustered: IS_CLUSTER_WORKER,
  });
});

// Setup Socket.IO Redis adapter for cluster mode
async function setupSocketIOCluster() {
  if (IS_CLUSTER_WORKER && redisClient) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const pubClient = redisClient;
      const subClient = pubClient.duplicate();

      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));

      console.log(`[Worker ${WORKER_ID}] Socket.IO Redis adapter configured`);
    } catch (error) {
      console.warn(`[Worker ${WORKER_ID}] Socket.IO Redis adapter failed:`, error.message);
    }
  }
}

// Start the server
httpServer.listen(PORT, async () => {
  console.log(`🔥 Worker ${WORKER_ID} (PID: ${process.pid}) running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Socket.IO enabled ${IS_CLUSTER_WORKER ? 'with clustering' : ''}`);

  // Setup Socket.IO clustering
  await setupSocketIOCluster();

  // Initialize Redis connection
  try {
    const redisConnected = await cacheService.ping();
    console.log(`[Worker ${WORKER_ID}] 🟢 Redis: ${redisConnected ? 'Connected' : 'Disconnected'}`);

    if (redisConnected) {
      console.log(`[Worker ${WORKER_ID}] 💾 Cache service initialized`);
      console.log(`[Worker ${WORKER_ID}] ⚡ Performance optimization enabled`);
    }
  } catch (error) {
    console.error(`[Worker ${WORKER_ID}] 🔴 Redis connection failed:`, error.message);
    console.log(`[Worker ${WORKER_ID}] ⚠️  Running without cache optimization`);
  }

  // Worker-specific performance monitoring
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const memory = process.memoryUsage();
      const cpu = process.cpuUsage();
      console.log(
        `[Worker ${WORKER_ID}] Memory: ${Math.round(memory.rss / 1024 / 1024)}MB, Connections: ${
          io.engine.clientsCount || 0
        }`
      );
    }, 30000);
  }
});

// Make server available globally for graceful shutdown
global.httpServer = httpServer;
global.io = io;

// Worker-specific graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`[Worker ${WORKER_ID}] Received ${signal}. Starting graceful shutdown...`);

  // Close server to new connections
  httpServer.close(() => {
    console.log(`[Worker ${WORKER_ID}] HTTP server closed`);

    // Close Socket.IO
    io.close(() => {
      console.log(`[Worker ${WORKER_ID}] Socket.IO closed`);

      // Close Redis connections
      if (redisClient && redisClient.quit) {
        redisClient.quit(() => {
          console.log(`[Worker ${WORKER_ID}] Redis connections closed`);
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error(`[Worker ${WORKER_ID}] Forced shutdown after timeout`);
    process.exit(1);
  }, 10000);
}

module.exports = { app, httpServer, io };
