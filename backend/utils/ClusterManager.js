const cluster = require('cluster');
const os = require('os');
const path = require('path');

/**
 * Cluster Manager for Node.js Application
 * Manages worker processes and implements graceful shutdown
 */

class ClusterManager {
  constructor(options = {}) {
    this.workerScript = options.workerScript || './server.js';
    this.workers = options.workers || os.cpus().length;
    this.maxRestarts = options.maxRestarts || 10;
    this.restartDelay = options.restartDelay || 1000;
    this.gracefulTimeout = options.gracefulTimeout || 30000;

    this.workerRestarts = new Map();
    this.isShuttingDown = false;
    this.startTime = Date.now();

    console.log(`🚀 Cluster Manager initialized`);
    console.log(`💻 CPU Cores detected: ${os.cpus().length}`);
    console.log(`👥 Workers to spawn: ${this.workers}`);
  }

  /**
   * Start the cluster with worker processes
   */
  start() {
    if (cluster.isMaster) {
      console.log(`🎯 Master process ${process.pid} starting...`);
      this.startMaster();
    } else {
      console.log(`🔥 Worker process ${process.pid} starting...`);
      this.startWorker();
    }
  }

  /**
   * Start master process and manage workers
   */
  startMaster() {
    // Setup cluster environment
    cluster.setupMaster({
      exec: this.workerScript,
      silent: false,
    });

    // Create initial workers
    for (let i = 0; i < this.workers; i++) {
      this.createWorker(i);
    }

    // Handle worker events
    cluster.on('exit', (worker, code, signal) => {
      this.handleWorkerExit(worker, code, signal);
    });

    cluster.on('online', worker => {
      console.log(`✅ Worker ${worker.process.pid} is online`);
    });

    cluster.on('disconnect', worker => {
      console.log(`🔌 Worker ${worker.process.pid} disconnected`);
    });

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    // Setup health monitoring
    this.setupHealthMonitoring();

    console.log(`🎉 Cluster started with ${this.workers} workers`);
  }

  /**
   * Create a new worker process
   */
  createWorker(workerId) {
    const worker = cluster.fork({
      WORKER_ID: workerId,
      CLUSTER_WORKER: 'true',
    });

    worker.workerId = workerId;
    worker.startTime = Date.now();

    // Initialize restart counter
    if (!this.workerRestarts.has(workerId)) {
      this.workerRestarts.set(workerId, 0);
    }

    console.log(`👷 Worker ${workerId} created with PID ${worker.process.pid}`);
    return worker;
  }

  /**
   * Handle worker process exit
   */
  handleWorkerExit(worker, code, signal) {
    const workerId = worker.workerId;
    const restartCount = this.workerRestarts.get(workerId) || 0;

    console.log(`💥 Worker ${worker.process.pid} (ID: ${workerId}) died`);
    console.log(`   Exit Code: ${code}, Signal: ${signal}`);
    console.log(`   Restart Count: ${restartCount}/${this.maxRestarts}`);

    if (!this.isShuttingDown) {
      if (restartCount < this.maxRestarts) {
        console.log(`🔄 Restarting worker ${workerId} in ${this.restartDelay}ms...`);

        setTimeout(() => {
          this.workerRestarts.set(workerId, restartCount + 1);
          this.createWorker(workerId);
        }, this.restartDelay);
      } else {
        console.error(`❌ Worker ${workerId} exceeded max restarts (${this.maxRestarts})`);
        console.error(`🚨 Consider investigating the issue before restarting`);
      }
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown() {
    const gracefulShutdown = signal => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      this.shutdown();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) {
      console.log('⚠️  Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('🔄 Disconnecting all workers...');

    const workers = Object.values(cluster.workers);
    const shutdownPromises = workers.map(worker => this.shutdownWorker(worker));

    // Wait for all workers to shutdown or timeout
    try {
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), this.gracefulTimeout)
        ),
      ]);
      console.log('✅ All workers shut down gracefully');
    } catch (error) {
      console.warn('⚠️  Forcing shutdown due to timeout');
      workers.forEach(worker => {
        if (!worker.isDead()) {
          console.log(`🔪 Force killing worker ${worker.process.pid}`);
          worker.kill('SIGKILL');
        }
      });
    }

    console.log('👋 Master process exiting...');
    process.exit(0);
  }

  /**
   * Shutdown individual worker
   */
  shutdownWorker(worker) {
    return new Promise(resolve => {
      if (worker.isDead()) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.warn(`⚠️  Worker ${worker.process.pid} didn't exit gracefully`);
        if (!worker.isDead()) {
          worker.kill('SIGKILL');
        }
        resolve();
      }, this.gracefulTimeout / 2);

      worker.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      console.log(`📤 Sending disconnect to worker ${worker.process.pid}`);
      worker.disconnect();
    });
  }

  /**
   * Setup health monitoring and statistics
   */
  setupHealthMonitoring() {
    // Log cluster stats every 30 seconds
    setInterval(() => {
      this.logClusterStats();
    }, 30000);

    // Log initial stats after 5 seconds
    setTimeout(() => {
      this.logClusterStats();
    }, 5000);
  }

  /**
   * Log cluster statistics
   */
  logClusterStats() {
    const workers = Object.values(cluster.workers);
    const aliveWorkers = workers.filter(w => !w.isDead());
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    console.log('\n📊 Cluster Health Report:');
    console.log(`   Master PID: ${process.pid}`);
    console.log(`   Uptime: ${uptime}s`);
    console.log(`   Workers: ${aliveWorkers.length}/${this.workers} alive`);
    console.log(`   Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);

    aliveWorkers.forEach(worker => {
      const workerUptime = Math.round((Date.now() - worker.startTime) / 1000);
      const restarts = this.workerRestarts.get(worker.workerId) || 0;
      console.log(
        `   Worker ${worker.workerId}: PID ${worker.process.pid}, Uptime: ${workerUptime}s, Restarts: ${restarts}`
      );
    });

    // Check for unhealthy cluster
    if (aliveWorkers.length < this.workers / 2) {
      console.warn('🚨 CLUSTER HEALTH WARNING: Less than 50% workers alive!');
    }
  }

  /**
   * Start worker process (called in worker context)
   */
  startWorker() {
    const workerId = process.env.WORKER_ID || 'unknown';
    console.log(`🔥 Starting worker ${workerId} (PID: ${process.pid})`);

    // Load the actual server
    require(this.workerScript);

    // Setup worker-specific graceful shutdown
    process.on('SIGTERM', () => {
      console.log(`🛑 Worker ${process.pid} received SIGTERM`);
      this.shutdownWorkerProcess();
    });

    process.on('disconnect', () => {
      console.log(`🔌 Worker ${process.pid} disconnected from master`);
      this.shutdownWorkerProcess();
    });
  }

  /**
   * Shutdown worker process gracefully
   */
  shutdownWorkerProcess() {
    console.log(`🔄 Worker ${process.pid} starting graceful shutdown...`);

    // Close server if it exists
    if (global.httpServer) {
      global.httpServer.close(() => {
        console.log(`✅ Worker ${process.pid} HTTP server closed`);
        process.exit(0);
      });
    } else {
      process.exit(0);
    }

    // Force exit after timeout
    setTimeout(() => {
      console.warn(`⚠️  Worker ${process.pid} forcing exit`);
      process.exit(1);
    }, 10000);
  }

  /**
   * Get cluster information
   */
  getClusterInfo() {
    if (!cluster.isMaster) return null;

    const workers = Object.values(cluster.workers);
    return {
      master: {
        pid: process.pid,
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
      },
      workers: workers.map(worker => ({
        id: worker.workerId,
        pid: worker.process.pid,
        uptime: Date.now() - worker.startTime,
        restarts: this.workerRestarts.get(worker.workerId) || 0,
        alive: !worker.isDead(),
      })),
      stats: {
        totalWorkers: this.workers,
        aliveWorkers: workers.filter(w => !w.isDead()).length,
        maxRestarts: this.maxRestarts,
      },
    };
  }
}

module.exports = ClusterManager;
