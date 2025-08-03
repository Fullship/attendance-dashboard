const path = require('path');
const cron = require('node-cron');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import database connection and utilities
const { redis: redisClient, cacheService } = require('./config/redis');

console.log('🔧 Starting Attendance Dashboard Background Worker...');
console.log(`📊 Worker Type: ${process.env.WORKER_TYPE || 'background-tasks'}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🆔 Process ID: ${process.pid}`);

// Graceful shutdown handling
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop all cron jobs
    console.log('⏹️ Stopping cron jobs...');
    cron.getTasks().forEach(task => task.stop());

    // Close Redis connection
    if (redisClient) {
      console.log('🔌 Closing Redis connection...');
      await redisClient.quit();
    }

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

function handleError(error) {
  console.error('💥 Unhandled error:', error);
  // Don't exit immediately, let PM2 handle restart
  setTimeout(() => process.exit(1), 1000);
}

// Background Tasks
class BackgroundWorker {
  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = new Date();
    this.tasksCompleted = 0;
    this.tasksFailed = 0;
  }

  // Health check endpoint (can be called by monitoring systems)
  getHealthStatus() {
    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      lastHealthCheck: this.lastHealthCheck,
      tasksCompleted: this.tasksCompleted,
      tasksFailed: this.tasksFailed,
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
    };
  }

  // Cache cleanup task
  async cleanupExpiredCache() {
    try {
      console.log('🧹 Starting cache cleanup...');

      if (cacheService) {
        // Clean up expired sessions, temporary data, etc.
        const keys = await cacheService.keys('session:*');
        const expiredKeys = [];

        for (const key of keys) {
          const ttl = await cacheService.ttl(key);
          if (ttl === -1) {
            // No expiration set
            expiredKeys.push(key);
          }
        }

        if (expiredKeys.length > 0) {
          await cacheService.del(...expiredKeys);
          console.log(`🗑️ Cleaned up ${expiredKeys.length} expired cache entries`);
        }
      }

      this.tasksCompleted++;
      console.log('✅ Cache cleanup completed');
    } catch (error) {
      this.tasksFailed++;
      console.error('❌ Cache cleanup failed:', error);
      this.isHealthy = false;
      setTimeout(() => {
        this.isHealthy = true;
      }, 300000); // Recover after 5 minutes
    }
  }

  // Database maintenance task
  async performDatabaseMaintenance() {
    try {
      console.log('🔧 Starting database maintenance...');

      // Here you can add database cleanup tasks like:
      // - Archiving old attendance records
      // - Cleaning up temporary uploads
      // - Optimizing database tables
      // - Generating analytics reports

      // For now, just a health check
      console.log('📊 Database maintenance completed (placeholder)');

      this.tasksCompleted++;
    } catch (error) {
      this.tasksFailed++;
      console.error('❌ Database maintenance failed:', error);
      this.isHealthy = false;
      setTimeout(() => {
        this.isHealthy = true;
      }, 300000); // Recover after 5 minutes
    }
  }

  // Log analytics and metrics
  async generateMetrics() {
    try {
      console.log('📈 Generating performance metrics...');

      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        tasksCompleted: this.tasksCompleted,
        tasksFailed: this.tasksFailed,
        healthStatus: this.isHealthy ? 'healthy' : 'unhealthy',
      };

      // Store metrics in Redis for monitoring
      if (cacheService) {
        await cacheService.setex(
          `worker:metrics:${Date.now()}`,
          86400, // 24 hours
          JSON.stringify(metrics)
        );
      }

      console.log('📊 Metrics generated:', metrics);
      this.tasksCompleted++;
    } catch (error) {
      this.tasksFailed++;
      console.error('❌ Metrics generation failed:', error);
    }
  }

  // Cleanup old log files
  async cleanupLogs() {
    try {
      const fs = require('fs').promises;
      const logsDir = path.join(__dirname, '../logs');

      console.log('📝 Cleaning up old log files...');

      // Check if logs directory exists
      try {
        await fs.access(logsDir);
      } catch {
        console.log('📁 Logs directory does not exist, skipping cleanup');
        return;
      }

      const files = await fs.readdir(logsDir);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);

          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`🗑️ Deleted old log file: ${file}`);
          }
        }
      }

      this.tasksCompleted++;
      console.log('✅ Log cleanup completed');
    } catch (error) {
      this.tasksFailed++;
      console.error('❌ Log cleanup failed:', error);
    }
  }

  // Start all scheduled tasks
  start() {
    console.log('🚀 Starting scheduled background tasks...');

    // Cache cleanup - every 6 hours
    cron.schedule('0 */6 * * *', () => {
      console.log('⏰ Running scheduled cache cleanup...');
      this.cleanupExpiredCache();
    });

    // Database maintenance - daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      console.log('⏰ Running scheduled database maintenance...');
      this.performDatabaseMaintenance();
    });

    // Metrics generation - every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.generateMetrics();
    });

    // Log cleanup - weekly on Sunday at 3 AM
    cron.schedule('0 3 * * 0', () => {
      console.log('⏰ Running weekly log cleanup...');
      this.cleanupLogs();
    });

    // Health check update - every minute
    cron.schedule('* * * * *', () => {
      this.lastHealthCheck = new Date();
    });

    console.log('✅ All background tasks scheduled');

    // Run initial tasks
    setTimeout(() => this.generateMetrics(), 5000); // Initial metrics after 5 seconds
  }
}

// Initialize and start the worker
const worker = new BackgroundWorker();

// Simple HTTP server for health checks (optional)
if (process.env.ENABLE_WORKER_HTTP === 'true') {
  const http = require('http');

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(worker.getHealthStatus(), null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  const workerPort = process.env.WORKER_PORT || 3003;
  server.listen(workerPort, () => {
    console.log(`🌐 Worker health endpoint available at http://localhost:${workerPort}/health`);
  });
}

// Start the worker
worker.start();

console.log(`🎉 Background worker started successfully! (PID: ${process.pid})`);

// Keep the process alive
process.on('exit', code => {
  console.log(`📊 Worker process exiting with code: ${code}`);
});
