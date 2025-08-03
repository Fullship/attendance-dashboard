const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');

/**
 * Worker Thread Pool Manager
 * Manages a pool of worker threads for CPU-intensive operations
 * to prevent blocking the main event loop
 */
class WorkerPool {
  constructor(workerScript, poolSize = os.cpus().length) {
    this.workerScript = path.resolve(workerScript);
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.workerIndex = 0;
    this.activeJobs = 0;
    this.totalJobsProcessed = 0;
    this.stats = {
      created: new Date(),
      jobsCompleted: 0,
      jobsFailed: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
    };

    this.initializeWorkers();
  }

  /**
   * Initialize worker threads
   */
  initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker(i);
    }
    console.log(
      `✅ Worker pool initialized with ${this.poolSize} workers for ${this.workerScript}`
    );
  }

  /**
   * Create a single worker thread
   */
  createWorker(id) {
    const worker = {
      id,
      worker: new Worker(this.workerScript),
      busy: false,
      jobsCompleted: 0,
      jobsFailed: 0,
      created: new Date(),
    };

    // Handle worker errors
    worker.worker.on('error', error => {
      console.error(`❌ Worker ${id} error:`, error);
      this.stats.jobsFailed++;

      // Recreate worker if it fails
      this.recreateWorker(id);
    });

    // Handle worker exit
    worker.worker.on('exit', code => {
      if (code !== 0) {
        console.error(`❌ Worker ${id} exited with code ${code}`);
        this.recreateWorker(id);
      }
    });

    this.workers[id] = worker;
  }

  /**
   * Recreate a failed worker
   */
  recreateWorker(id) {
    try {
      if (this.workers[id]) {
        this.workers[id].worker.terminate();
      }
      this.createWorker(id);
      console.log(`🔄 Worker ${id} recreated`);
    } catch (error) {
      console.error(`❌ Failed to recreate worker ${id}:`, error);
    }
  }

  /**
   * Execute a task using available worker
   */
  async execute(data, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const jobStart = Date.now();
      const job = {
        data,
        resolve: result => {
          const processingTime = Date.now() - jobStart;
          this.updateStats(processingTime, true);
          resolve(result);
        },
        reject: error => {
          const processingTime = Date.now() - jobStart;
          this.updateStats(processingTime, false);
          reject(error);
        },
        timeout: setTimeout(() => {
          this.updateStats(Date.now() - jobStart, false);
          reject(new Error(`Worker job timed out after ${timeout}ms`));
        }, timeout),
        startTime: jobStart,
      };

      this.queue.push(job);
      this.processQueue();
    });
  }

  /**
   * Process job queue
   */
  processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;

    const job = this.queue.shift();
    availableWorker.busy = true;
    this.activeJobs++;

    // Clear timeout since job is starting
    clearTimeout(job.timeout);

    // Set new timeout for actual processing
    const processingTimeout = setTimeout(() => {
      availableWorker.busy = false;
      this.activeJobs--;
      availableWorker.jobsFailed++;
      job.reject(new Error('Worker processing timeout'));
      this.processQueue();
    }, 30000);

    // Send data to worker
    availableWorker.worker.postMessage(job.data);

    // Handle worker response
    const onMessage = result => {
      clearTimeout(processingTimeout);
      availableWorker.busy = false;
      this.activeJobs--;
      availableWorker.jobsCompleted++;

      availableWorker.worker.off('message', onMessage);
      availableWorker.worker.off('error', onError);

      if (result.success === false) {
        job.reject(new Error(result.error || 'Worker job failed'));
      } else {
        job.resolve(result);
      }

      this.processQueue();
    };

    const onError = error => {
      clearTimeout(processingTimeout);
      availableWorker.busy = false;
      this.activeJobs--;
      availableWorker.jobsFailed++;

      availableWorker.worker.off('message', onMessage);
      availableWorker.worker.off('error', onError);

      job.reject(error);
      this.processQueue();
    };

    availableWorker.worker.once('message', onMessage);
    availableWorker.worker.once('error', onError);
  }

  /**
   * Update performance statistics
   */
  updateStats(processingTime, success) {
    this.totalJobsProcessed++;
    this.stats.totalProcessingTime += processingTime;
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.totalJobsProcessed;

    if (success) {
      this.stats.jobsCompleted++;
    } else {
      this.stats.jobsFailed++;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.poolSize,
      activeJobs: this.activeJobs,
      queueLength: this.queue.length,
      workers: this.workers.map(w => ({
        id: w.id,
        busy: w.busy,
        jobsCompleted: w.jobsCompleted,
        jobsFailed: w.jobsFailed,
        uptime: Date.now() - w.created.getTime(),
      })),
      successRate:
        this.totalJobsProcessed > 0
          ? ((this.stats.jobsCompleted / this.totalJobsProcessed) * 100).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Process multiple jobs concurrently
   */
  async executeAll(jobs, concurrency = this.poolSize) {
    const results = [];
    const errors = [];

    // Process jobs in batches to control concurrency
    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const batchPromises = batch.map(async (job, index) => {
        try {
          const result = await this.execute(job);
          return { index: i + index, result, success: true };
        } catch (error) {
          return { index: i + index, error, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach(({ value }) => {
        if (value.success) {
          results.push(value);
        } else {
          errors.push(value);
        }
      });
    }

    return {
      results: results.sort((a, b) => a.index - b.index),
      errors: errors.sort((a, b) => a.index - b.index),
      stats: this.getStats(),
    };
  }

  /**
   * Gracefully shutdown worker pool
   */
  async terminate() {
    console.log(`🛑 Terminating worker pool with ${this.workers.length} workers...`);

    const terminationPromises = this.workers.map(async worker => {
      try {
        await worker.worker.terminate();
        console.log(`✅ Worker ${worker.id} terminated`);
      } catch (error) {
        console.error(`❌ Error terminating worker ${worker.id}:`, error);
      }
    });

    await Promise.all(terminationPromises);

    // Clear any remaining timeouts
    this.queue.forEach(job => {
      if (job.timeout) {
        clearTimeout(job.timeout);
      }
    });

    this.queue = [];
    this.workers = [];

    console.log('✅ Worker pool terminated');
  }

  /**
   * Check if pool is healthy
   */
  isHealthy() {
    const healthyWorkers = this.workers.filter(w => !w.busy && w.worker.threadId).length;
    const healthRatio = healthyWorkers / this.poolSize;

    return {
      healthy: healthRatio >= 0.5, // At least 50% of workers should be healthy
      healthyWorkers,
      totalWorkers: this.poolSize,
      healthRatio: (healthRatio * 100).toFixed(2) + '%',
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
    };
  }
}

module.exports = WorkerPool;
