#!/usr/bin/env node

/**
 * Cluster-Enabled Server Entrypoint
 * Spawns worker processes equal to CPU count and manages worker lifecycles
 */

const cluster = require('cluster');
const os = require('os');
const path = require('path');
const ClusterManager = require('./utils/ClusterManager');

// Configuration
const config = {
  workers: parseInt(process.env.CLUSTER_WORKERS) || os.cpus().length,
  maxRestarts: parseInt(process.env.MAX_WORKER_RESTARTS) || 10,
  restartDelay: parseInt(process.env.WORKER_RESTART_DELAY) || 1000,
  gracefulTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 30000,
  enableClustering: process.env.ENABLE_CLUSTERING !== 'false',
};

/**
 * Start the application with or without clustering
 */
function startApplication() {
  console.log('🚀 Starting Attendance Dashboard Backend...');
  console.log(`🔧 Configuration:`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Clustering: ${config.enableClustering ? 'Enabled' : 'Disabled'}`);
  console.log(`   CPU Cores: ${os.cpus().length}`);
  console.log(`   Workers: ${config.workers}`);

  if (config.enableClustering && cluster.isMaster) {
    startClusteredMode();
  } else {
    startSingleMode();
  }
}

/**
 * Start in clustered mode (recommended for production)
 */
function startClusteredMode() {
  console.log('\n🏭 Starting in Clustered Mode...');

  const clusterManager = new ClusterManager({
    workerScript: path.join(__dirname, 'server-worker.js'),
    workers: config.workers,
    maxRestarts: config.maxRestarts,
    restartDelay: config.restartDelay,
    gracefulTimeout: config.gracefulTimeout,
  });

  // Expose cluster info for monitoring
  global.clusterManager = clusterManager;

  clusterManager.start();

  // Setup cluster monitoring API endpoint (master only)
  if (cluster.isMaster) {
    setupClusterMonitoring(clusterManager);
  }
}

/**
 * Start in single mode (development or small deployments)
 */
function startSingleMode() {
  console.log('\n🔧 Starting in Single Process Mode...');
  console.log('💡 Enable clustering with ENABLE_CLUSTERING=true for production');

  require('./server-worker.js');
}

/**
 * Setup cluster monitoring and management endpoints
 */
function setupClusterMonitoring(clusterManager) {
  const express = require('express');
  const monitoringApp = express();
  const monitoringPort = parseInt(process.env.CLUSTER_MONITORING_PORT) || 3003;

  monitoringApp.use(express.json());

  // Cluster health endpoint
  monitoringApp.get('/', (req, res) => {
    res.json({
      message: 'Cluster Monitoring API',
      endpoints: [
        '/cluster/health',
        '/cluster/stats',
        '/cluster/logs',
        '/cluster/restart (POST)'
      ]
    });
  });
  monitoringApp.get('/cluster/health', (req, res) => {
    const info = clusterManager.getClusterInfo();
    const healthyWorkers = info.workers.filter(w => w.alive).length;
    const isHealthy = healthyWorkers >= Math.ceil(info.stats.totalWorkers / 2);

    res.json({
      healthy: isHealthy,
      master: info.master,
      workers: info.workers,
      stats: {
        ...info.stats,
        healthyWorkers,
        healthRatio: `${((healthyWorkers / info.stats.totalWorkers) * 100).toFixed(1)}%`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Cluster statistics endpoint
  monitoringApp.get('/cluster/stats', (req, res) => {
    res.json(clusterManager.getClusterInfo());
  });

  // Restart all workers endpoint
  monitoringApp.post('/cluster/restart', (req, res) => {
    console.log('🔄 Manual cluster restart requested');

    const workers = Object.values(cluster.workers);
    let restarted = 0;

    workers.forEach((worker, index) => {
      setTimeout(() => {
        if (!worker.isDead()) {
          console.log(`🔄 Restarting worker ${worker.process.pid}`);
          worker.disconnect();
        }
        restarted++;
      }, index * 2000); // Stagger restarts
    });

    res.json({
      message: 'Cluster restart initiated',
      workersToRestart: workers.length,
      staggerDelay: '2 seconds',
    });
  });

  // Worker logs endpoint (simple implementation)
  monitoringApp.get('/cluster/logs', (req, res) => {
    res.json({
      message: 'Worker logs endpoint',
      note: 'Implement centralized logging for detailed worker logs',
      workers: Object.values(cluster.workers).map(w => ({
        id: w.workerId,
        pid: w.process.pid,
        alive: !w.isDead(),
      })),
    });
  });

  monitoringApp.listen(monitoringPort, () => {
    console.log(`📊 Cluster monitoring available at http://localhost:${monitoringPort}`);
    console.log(`   Health: http://localhost:${monitoringPort}/cluster/health`);
    console.log(`   Stats: http://localhost:${monitoringPort}/cluster/stats`);
    console.log(`   Restart: POST http://localhost:${monitoringPort}/cluster/restart`);
  });
}

// Environment-specific optimizations
function optimizeForEnvironment() {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    // Production optimizations
    config.workers = config.workers || os.cpus().length;
    config.maxRestarts = config.maxRestarts || 5;
    config.enableClustering = true;

    console.log('🏭 Production mode: Full clustering enabled');
  } else if (env === 'development') {
    // Development optimizations
    config.workers = Math.min(config.workers, 2); // Limit workers in dev
    config.enableClustering = process.env.ENABLE_CLUSTERING === 'true';

    console.log('🔧 Development mode: Limited clustering');
  } else {
    // Default/test mode
    config.workers = 1;
    config.enableClustering = false;

    console.log('🧪 Test mode: Single process');
  }
}

// Performance monitoring setup
function setupPerformanceMonitoring() {
  if (cluster.isMaster) {
    // Monitor overall system performance
    setInterval(() => {
      const usage = process.cpuUsage();
      const memory = process.memoryUsage();

      console.log('\n⚡ System Performance:');
      console.log(
        `   CPU Usage: ${(usage.user / 1000000).toFixed(2)}s user, ${(
          usage.system / 1000000
        ).toFixed(2)}s system`
      );
      console.log(
        `   Memory: ${Math.round(memory.rss / 1024 / 1024)}MB RSS, ${Math.round(
          memory.heapUsed / 1024 / 1024
        )}MB Heap`
      );

      const workers = Object.values(cluster.workers || {});
      console.log(
        `   Workers: ${workers.filter(w => !w.isDead()).length}/${workers.length} active`
      );
    }, 60000); // Every minute
  }
}

// Signal handling for development
function setupDevelopmentHelpers() {
  if (process.env.NODE_ENV === 'development') {
    // Graceful restart on SIGUSR2 (nodemon)
    process.on('SIGUSR2', () => {
      console.log('🔄 Development restart signal received');
      if (cluster.isMaster && global.clusterManager) {
        global.clusterManager.shutdown();
      } else {
        process.exit(0);
      }
    });
  }
}

// Main execution
if (require.main === module) {
  // Apply environment optimizations
  optimizeForEnvironment();

  // Setup performance monitoring
  setupPerformanceMonitoring();

  // Setup development helpers
  setupDevelopmentHelpers();

  // Start the application
  startApplication();
}

module.exports = {
  startApplication,
  startClusteredMode,
  startSingleMode,
  config,
};
