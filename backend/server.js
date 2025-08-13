// Initialize Datadog APM (must be first import)
require('./config/datadog');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import compression middleware
const { compressionMiddleware, compressionLogger } = require('./middleware/compression');

// Import static cache middleware
const {
  createStaticCacheMiddleware,
  serviceWorkerNoCache,
  generateBuildHash,
  injectBuildHash,
} = require('./middleware/static-cache');

// Import custom instrumentation
const instrumentation = require('./middleware/instrumentation');

// Import comprehensive monitoring instrumentation
const monitoringInstrumentation = require('./middleware/monitoring-instrumentation');

// Import Redis configuration
const { redis: redisClient, cacheService } = require('./config/redis');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const adminRoutes = require('./routes/admin');
const enhancedLeaveRoutes = require('./routes/enhanced-leave');
const adminLeaveRoutes = require('./routes/admin-leave');
const rolesRoutes = require('./routes/roles');
const performanceRoutes = require('./routes/performance');

// Import database monitoring middleware
const DatabaseMonitoringAPI = require('./middleware/database-monitoring');
const dbMonitoring = new DatabaseMonitoringAPI();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3002;

// Initialize Socket.IO with matching CORS
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
            'https://my.fullship.net',
          ];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  },
});

// Make io available to routes
app.set('io', io);

// Security middleware
app.use(helmet());

// Session management (will add Redis store later)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'attendance-dashboard-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
    name: 'attendance.sid',
  })
);

// Rate limiting with Redis (simplified) - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  },
});
app.use('/api/', limiter);

// CORS configuration with detailed options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3004',
          'http://localhost:3005',
          'https://my.fullship.net',
        ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Datadog instrumentation middleware
app.use((req, res, next) => {
  // Set user context if available from JWT
  if (req.user) {
    instrumentation.setUserContext(req.user);
  }

  // Add request correlation ID
  req.correlationId = instrumentation.getCurrentTraceId();

  // Add custom route tags
  const route = req.route?.path || req.path;
  if (route) {
    instrumentation.trackMetric('http.request', 1, {
      'http.method': req.method,
      'http.route': route,
      'http.status': res.statusCode,
    });
  }

  next();
});

// Compression middleware - Enable gzip compression for JSON, HTML and other responses
app.use(compressionMiddleware);

// Compression logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(compressionLogger);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Comprehensive monitoring instrumentation
app.use(monitoringInstrumentation.requestInstrumentation());

// Add a middleware to ensure proper headers for compression
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3004',
        'http://localhost:3005',
        'https://my.fullship.net',
      ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Set cache-control headers for better compression efficiency
  if (req.url.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  // Set Vary header to indicate compression varies by Accept-Encoding
  res.setHeader('Vary', 'Accept-Encoding');

  next();
});

// Test endpoint to verify compression
app.get('/api/compression-test', (req, res) => {
  const testData = {
    message: 'This is a test endpoint to verify gzip compression is working',
    timestamp: new Date().toISOString(),
    largeData: Array(1000)
      .fill(0)
      .map((_, i) => ({
        id: i,
        name: `Test Item ${i}`,
        description: `This is test item number ${i} with some longer description to make the payload larger and test compression effectiveness`,
        metadata: {
          created: new Date().toISOString(),
          tags: ['test', 'compression', 'gzip', `item-${i}`],
          properties: {
            active: i % 2 === 0,
            priority: Math.floor(Math.random() * 5) + 1,
            category: ['A', 'B', 'C'][i % 3],
          },
        },
      })),
    compressionInfo: {
      middleware: 'active',
      expectedCompression: true,
      contentType: 'application/json',
    },
  };

  res.json(testData);
});

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`
  );
  next();
});

// Import routes
// const leaveRoutes = require('./routes/leave');

// Import query tracking middleware
const { createQueryTrackingMiddleware } = require('./middleware/queryTracking');

// Add query tracking middleware for N+1 detection
app.use(
  '/api/',
  createQueryTrackingMiddleware({
    enabled: process.env.ENABLE_N_PLUS_ONE_DETECTION !== 'false',
    logThreshold: 5,
    includeHeaders: process.env.NODE_ENV === 'development',
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', rolesRoutes); // Mount role routes under admin
// app.use('/api/leave', leaveRoutes);
app.use('/api/enhanced-leave', enhancedLeaveRoutes);
app.use('/api/admin-leave', adminLeaveRoutes);
app.use('/api/performance', performanceRoutes);

// Setup database monitoring API routes
dbMonitoring.setupRoutes(app);

// Generate build hash for cache busting
const BUILD_HASH = generateBuildHash();

// Static file serving with cache control (if serving React build from Express)
// This is typically handled by Nginx in production, but useful for development
if (process.env.NODE_ENV === 'development' || process.env.SERVE_STATIC === 'true') {
  // Apply cache middleware first
  app.use(createStaticCacheMiddleware(path.join(__dirname, '../frontend/build')));
  app.use(serviceWorkerNoCache);
  app.use(injectBuildHash(BUILD_HASH));

  // Serve static files from React build directory
  app.use(
    express.static(path.join(__dirname, '../frontend/build'), {
      index: false, // Don't serve index.html automatically
      maxAge: 0, // Let our middleware handle caching
      etag: false, // Let our middleware handle etag
      lastModified: false, // Let our middleware handle last-modified
    })
  );

  // Serve index.html for SPA routes (React Router)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }

    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisStatus = await cacheService.ping();
    
    // Check database connection and users table
    let dbConnected = false;
    let dbError = null;
    let usersTableExists = false;
    let userCount = 0;
    
    try {
      // Test basic database connection
      const pool = require('./config/database');
      const testResult = await pool.query('SELECT 1 as test');
      dbConnected = testResult.rows.length > 0;
      
      // Test if users table exists and has data
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      usersTableExists = true;
      userCount = parseInt(usersResult.rows[0].count);
    } catch (error) {
      dbError = error.message;
      console.log('Database health check error:', error.message);
    }

    // Get monitoring health status
    const monitoringHealth = monitoringInstrumentation.getHealthStatus();

    res.json({
      status: monitoringHealth.status,
      timestamp: new Date().toISOString(),
      services: {
        redis: redisStatus ? 'connected' : 'disconnected',
        database: dbConnected ? 'connected' : 'disconnected',
      },
      database: {
        connected: dbConnected,
        usersTableExists: usersTableExists,
        userCount: userCount,
        error: dbError
      },
      monitoring: monitoringHealth,
      uptime: process.uptime(),
      workers: {
        active: cluster.isMaster ? Object.keys(cluster.workers || {}).length : 1,
        total: cluster.isMaster ? Object.keys(cluster.workers || {}).length : 1
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Build information endpoint for cache busting
app.get('/api/build-info', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  res.json({
    hash: BUILD_HASH,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    nodeEnv: process.env.NODE_ENV,
    releaseNotes: 'Performance optimizations: React.lazy, virtualization, compression, caching',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  res.status(500).json({
    message: 'Something went wrong!',
    error:
      process.env.NODE_ENV === 'development'
        ? {
            message: err.message,
            stack: err.stack,
          }
        : {},
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Socket.IO connection handling
io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 Socket.IO enabled with CORS: ${process.env.FRONTEND_URL}`);

  // Initialize Redis connection
  try {
    const redisConnected = await cacheService.ping();
    console.log(`🟢 Redis: ${redisConnected ? 'Connected' : 'Disconnected'}`);

    if (redisConnected) {
      console.log(`💾 Cache service initialized successfully`);
      console.log(`⚡ Performance optimization enabled`);
    }
  } catch (error) {
    console.error('🔴 Redis connection failed:', error.message);
    console.log('⚠️  Running without cache optimization');
  }
});
