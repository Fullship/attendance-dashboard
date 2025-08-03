/**
 * Memory Profiler Utility
 * Integrates heapdump for memory snapshot analysis in development
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class MemoryProfiler {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    this.heapdump = null;
    this.snapshotCounter = 0;
    this.snapshotsDir = path.join(__dirname, '..', 'memory-snapshots');

    // Only load heapdump in development to avoid production overhead
    if (this.isDevelopment) {
      try {
        this.heapdump = require('heapdump');
        this.initializeSnapshotDirectory();
        console.log('🔍 Memory Profiler initialized - heapdump ready');
      } catch (error) {
        console.warn('⚠️  Heapdump not available:', error.message);
      }
    }
  }

  /**
   * Initialize snapshots directory
   */
  async initializeSnapshotDirectory() {
    try {
      await fs.access(this.snapshotsDir);
    } catch {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
      console.log(`📁 Created memory snapshots directory: ${this.snapshotsDir}`);
    }
  }

  /**
   * Check if profiler is available
   */
  isAvailable() {
    return this.isDevelopment && this.heapdump !== null;
  }

  /**
   * Take a memory snapshot
   */
  async takeSnapshot(label = '') {
    if (!this.isAvailable()) {
      throw new Error(
        'Memory profiler not available - ensure NODE_ENV=development and heapdump is installed'
      );
    }

    try {
      await this.initializeSnapshotDirectory();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const counter = String(++this.snapshotCounter).padStart(3, '0');
      const labelSuffix = label ? `-${label.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
      const filename = `heapdump-${counter}-${timestamp}${labelSuffix}.heapsnapshot`;
      const filepath = path.join(this.snapshotsDir, filename);

      // Get memory usage before snapshot
      const memUsage = process.memoryUsage();

      // Take the heap snapshot
      this.heapdump.writeSnapshot(filepath);

      const stats = await fs.stat(filepath);

      const snapshotInfo = {
        filename,
        filepath,
        label,
        timestamp: new Date().toISOString(),
        counter: this.snapshotCounter,
        memoryUsage: {
          rss: this.formatBytes(memUsage.rss),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          external: this.formatBytes(memUsage.external),
          arrayBuffers: this.formatBytes(memUsage.arrayBuffers),
        },
        fileSize: this.formatBytes(stats.size),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
      };

      // Log snapshot info
      await this.logSnapshotInfo(snapshotInfo);

      console.log(`📸 Memory snapshot taken: ${filename}`);
      console.log(`   Heap Used: ${snapshotInfo.memoryUsage.heapUsed}`);
      console.log(`   File Size: ${snapshotInfo.fileSize}`);

      return snapshotInfo;
    } catch (error) {
      console.error('❌ Failed to take memory snapshot:', error);
      throw error;
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapUsedPercentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
        external: this.formatBytes(memUsage.external),
        arrayBuffers: this.formatBytes(memUsage.arrayBuffers),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      },
      system: {
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    };
  }

  /**
   * List all available snapshots
   */
  async listSnapshots() {
    if (!this.isDevelopment) {
      return { snapshots: [], message: 'Memory profiling only available in development' };
    }

    try {
      await this.initializeSnapshotDirectory();
      const files = await fs.readdir(this.snapshotsDir);

      const snapshots = [];
      for (const file of files) {
        if (file.endsWith('.heapsnapshot')) {
          const filepath = path.join(this.snapshotsDir, file);
          const stats = await fs.stat(filepath);

          snapshots.push({
            filename: file,
            filepath,
            size: this.formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
          });
        }
      }

      // Sort by creation time (newest first)
      snapshots.sort((a, b) => b.created - a.created);

      return { snapshots, count: snapshots.length };
    } catch (error) {
      console.error('❌ Failed to list snapshots:', error);
      return { snapshots: [], error: error.message };
    }
  }

  /**
   * Delete old snapshots (keep only latest N)
   */
  async cleanupSnapshots(keepCount = 10) {
    if (!this.isDevelopment) {
      return { message: 'Cleanup only available in development' };
    }

    try {
      const { snapshots } = await this.listSnapshots();

      if (snapshots.length <= keepCount) {
        return {
          message: `No cleanup needed. Found ${snapshots.length} snapshots (keeping ${keepCount})`,
          deleted: 0,
        };
      }

      const toDelete = snapshots.slice(keepCount);
      let deletedCount = 0;

      for (const snapshot of toDelete) {
        try {
          await fs.unlink(snapshot.filepath);
          deletedCount++;
          console.log(`🗑️  Deleted old snapshot: ${snapshot.filename}`);
        } catch (error) {
          console.warn(`⚠️  Failed to delete ${snapshot.filename}:`, error.message);
        }
      }

      return {
        message: `Cleanup completed. Deleted ${deletedCount} old snapshots`,
        deleted: deletedCount,
        remaining: snapshots.length - deletedCount,
      };
    } catch (error) {
      console.error('❌ Failed to cleanup snapshots:', error);
      return { error: error.message };
    }
  }

  /**
   * Log snapshot information to file
   */
  async logSnapshotInfo(snapshotInfo) {
    const logFile = path.join(this.snapshotsDir, 'snapshots.log');
    const logEntry = JSON.stringify(snapshotInfo, null, 2) + '\n---\n';

    try {
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.warn('⚠️  Failed to log snapshot info:', error.message);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Force garbage collection (if --expose-gc flag is used)
   */
  forceGC() {
    if (global.gc) {
      const beforeGC = process.memoryUsage();
      global.gc();
      const afterGC = process.memoryUsage();

      return {
        before: {
          heapUsed: this.formatBytes(beforeGC.heapUsed),
          heapTotal: this.formatBytes(beforeGC.heapTotal),
        },
        after: {
          heapUsed: this.formatBytes(afterGC.heapUsed),
          heapTotal: this.formatBytes(afterGC.heapTotal),
        },
        freed: this.formatBytes(beforeGC.heapUsed - afterGC.heapUsed),
      };
    } else {
      return {
        message: 'Garbage collection not available. Start with --expose-gc flag to enable.',
        example: 'node --expose-gc server.js',
      };
    }
  }

  /**
   * Get memory profiling instructions
   */
  getInstructions() {
    return {
      setup: {
        install: 'npm install heapdump --save-dev',
        environment: 'Set NODE_ENV=development',
        optional: 'Use --expose-gc flag for manual garbage collection',
      },
      usage: {
        takeSnapshot: 'POST /api/dev/memory/snapshot',
        getStats: 'GET /api/dev/memory/stats',
        listSnapshots: 'GET /api/dev/memory/snapshots',
        cleanup: 'DELETE /api/dev/memory/snapshots',
        forceGC: 'POST /api/dev/memory/gc',
      },
      analysis: {
        chrome: 'Open Chrome DevTools > Memory tab > Load Profile > Select .heapsnapshot file',
        compare: 'Take multiple snapshots and compare them to identify memory leaks',
        tips: [
          'Take snapshot before and after operations to see memory changes',
          'Look for increasing object counts between snapshots',
          'Focus on Detached DOM nodes and large objects',
          'Use the "Comparison" view to see differences between snapshots',
        ],
      },
      files: {
        location: this.snapshotsDir,
        logs: path.join(this.snapshotsDir, 'snapshots.log'),
      },
    };
  }
}

module.exports = new MemoryProfiler();
