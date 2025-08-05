/**
 * Advanced profiling utilities for CPU and memory analysis
 * Integrates with clinic.js and heapdump for production-ready profiling
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class ProfilingManager {
  constructor() {
    this.activeProfiles = new Map();
    this.profilesDir = path.join(process.cwd(), 'profiles');
    this.ensureProfilesDirectory();
    
    // Profile session tracking
    this.sessions = {
      cpu: null,
      memory: null,
      heap: []
    };
  }

  async ensureProfilesDirectory() {
    try {
      await fs.access(this.profilesDir);
    } catch {
      await fs.mkdir(this.profilesDir, { recursive: true });
      console.log('📁 Created profiles directory:', this.profilesDir);
    }
  }

  /**
   * Start CPU profiling using clinic.js flame
   * Requires: npm install -g clinic
   */
  async startCPUProfiling(options = {}) {
    const sessionId = `cpu-${Date.now()}`;
    const {
      duration = 30000, // 30 seconds default
      sampleInterval = 1, // 1ms
      label = 'cpu-profile'
    } = options;

    try {
      console.log(`🔥 Starting CPU profiling session: ${sessionId}`);

      // Check if clinic is available
      const clinicAvailable = await this.checkClinicAvailability();
      
      if (clinicAvailable) {
        // Use clinic.js flame for CPU profiling
        const profilePath = path.join(this.profilesDir, `${sessionId}-flame`);
        
        const clinicProcess = spawn('clinic', [
          'flame',
          '--autocannon', 'false',
          '--dest', profilePath,
          'node', process.argv[1] // Current node process
        ], {
          detached: true,
          stdio: 'ignore'
        });

        this.sessions.cpu = {
          sessionId,
          startTime: Date.now(),
          duration,
          profilePath,
          process: clinicProcess,
          status: 'running'
        };

        // Auto-stop after duration
        setTimeout(() => {
          this.stopCPUProfiling();
        }, duration);

        return {
          sessionId,
          status: 'started',
          profilePath,
          duration,
          message: 'CPU profiling started with clinic.js flame'
        };

      } else {
        // Fallback to Node.js built-in profiler
        return this.startBuiltinCPUProfiling(sessionId, options);
      }

    } catch (error) {
      console.error('Error starting CPU profiling:', error);
      throw new Error(`Failed to start CPU profiling: ${error.message}`);
    }
  }

  /**
   * Stop CPU profiling
   */
  async stopCPUProfiling() {
    if (!this.sessions.cpu) {
      throw new Error('No active CPU profiling session');
    }

    const session = this.sessions.cpu;
    console.log(`🛑 Stopping CPU profiling session: ${session.sessionId}`);

    try {
      if (session.process) {
        // Stop clinic.js process
        session.process.kill('SIGTERM');
        
        // Wait for process to complete profiling
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Profiling process timeout'));
          }, 10000);

          session.process.on('exit', (code) => {
            clearTimeout(timeout);
            resolve(code);
          });
        });
      }

      session.status = 'completed';
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;

      // Get profile file info
      const profileInfo = await this.getProfileInfo(session.profilePath);

      const result = {
        sessionId: session.sessionId,
        status: 'completed',
        profilePath: session.profilePath,
        duration: session.duration,
        fileInfo: profileInfo,
        viewInstructions: {
          message: 'Open the generated HTML file in your browser to view the flame graph',
          file: `${session.profilePath}.html`,
          alternativeTools: [
            'Chrome DevTools > Performance tab',
            'clinic.js flame --visualize-only ' + session.profilePath
          ]
        }
      };

      this.sessions.cpu = null;
      return result;

    } catch (error) {
      console.error('Error stopping CPU profiling:', error);
      session.status = 'failed';
      throw new Error(`Failed to stop CPU profiling: ${error.message}`);
    }
  }

  /**
   * Create memory heap snapshot
   */
  async createMemorySnapshot(label = null) {
    const sessionId = `heap-${Date.now()}`;
    const snapshotLabel = label || `snapshot-${sessionId}`;

    try {
      console.log(`📸 Creating memory heap snapshot: ${snapshotLabel}`);

      // Use v8-heapdump if available, fallback to inspector
      let snapshotPath;
      let method = 'unknown';

      try {
        // Try to use heapdump module
        const heapdump = require('heapdump');
        snapshotPath = path.join(this.profilesDir, `${sessionId}.heapsnapshot`);
        heapdump.writeSnapshot(snapshotPath);
        method = 'heapdump';
      } catch (heapdumpError) {
        // Fallback to inspector API
        const inspector = require('inspector');
        const session = new inspector.Session();
        
        session.connect();
        
        // Start heap profiling
        await new Promise((resolve, reject) => {
          session.post('HeapProfiler.enable', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Take snapshot
        const snapshot = await new Promise((resolve, reject) => {
          session.post('HeapProfiler.takeHeapSnapshot', null, (err, params) => {
            if (err) reject(err);
            else resolve(params);
          });
        });

        snapshotPath = path.join(this.profilesDir, `${sessionId}.heapsnapshot`);
        await fs.writeFile(snapshotPath, JSON.stringify(snapshot));
        
        session.disconnect();
        method = 'inspector';
      }

      // Get memory usage at time of snapshot
      const memoryUsage = process.memoryUsage();
      const memoryInfo = {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      };

      // Get file size
      const stats = await fs.stat(snapshotPath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;

      const snapshotInfo = {
        sessionId,
        label: snapshotLabel,
        timestamp: new Date().toISOString(),
        filepath: snapshotPath,
        filename: path.basename(snapshotPath),
        size: `${fileSizeMB} MB`,
        method,
        memoryUsage: memoryInfo,
        status: 'completed'
      };

      // Store in heap sessions
      this.sessions.heap.push(snapshotInfo);

      // Keep only last 10 snapshots
      if (this.sessions.heap.length > 10) {
        const oldSnapshot = this.sessions.heap.shift();
        try {
          await fs.unlink(oldSnapshot.filepath);
        } catch (err) {
          console.warn('Could not delete old snapshot:', oldSnapshot.filepath);
        }
      }

      console.log(`✅ Memory snapshot created: ${snapshotPath} (${fileSizeMB} MB)`);

      return snapshotInfo;

    } catch (error) {
      console.error('Error creating memory snapshot:', error);
      throw new Error(`Failed to create memory snapshot: ${error.message}`);
    }
  }

  /**
   * Get all memory snapshots
   */
  getMemorySnapshots() {
    return {
      snapshots: this.sessions.heap,
      total: this.sessions.heap.length,
      instructions: {
        analysis: 'Load .heapsnapshot files in Chrome DevTools Memory tab',
        steps: [
          '1. Open Chrome DevTools',
          '2. Go to Memory tab',
          '3. Click "Load profile" button',
          '4. Select the .heapsnapshot file',
          '5. Analyze memory usage patterns and potential leaks'
        ]
      }
    };
  }

  /**
   * Start memory profiling session (sampling)
   */
  async startMemoryProfiling(options = {}) {
    const {
      duration = 60000, // 1 minute default
      sampleInterval = 1000, // 1 second
      label = 'memory-profile'
    } = options;

    const sessionId = `memory-${Date.now()}`;
    
    console.log(`🧠 Starting memory profiling session: ${sessionId}`);

    const samples = [];
    const startTime = Date.now();

    const intervalHandle = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const timestamp = Date.now();
      
      samples.push({
        timestamp,
        elapsed: timestamp - startTime,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        }
      });
    }, sampleInterval);

    this.sessions.memory = {
      sessionId,
      startTime,
      duration,
      samples,
      interval: intervalHandle,
      status: 'running'
    };

    // Auto-stop after duration
    setTimeout(() => {
      this.stopMemoryProfiling();
    }, duration);

    return {
      sessionId,
      status: 'started',
      duration,
      sampleInterval,
      message: 'Memory profiling session started'
    };
  }

  /**
   * Stop memory profiling session
   */
  async stopMemoryProfiling() {
    if (!this.sessions.memory) {
      throw new Error('No active memory profiling session');
    }

    const session = this.sessions.memory;
    console.log(`🛑 Stopping memory profiling session: ${session.sessionId}`);

    clearInterval(session.interval);
    session.status = 'completed';
    session.endTime = Date.now();

    // Analyze samples
    const analysis = this.analyzeMemorySamples(session.samples);

    // Save results to file
    const resultPath = path.join(this.profilesDir, `${session.sessionId}-memory.json`);
    const results = {
      sessionId: session.sessionId,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime - session.startTime,
      sampleCount: session.samples.length,
      samples: session.samples,
      analysis
    };

    await fs.writeFile(resultPath, JSON.stringify(results, null, 2));

    this.sessions.memory = null;

    return {
      ...results,
      resultPath,
      message: 'Memory profiling completed'
    };
  }

  /**
   * Analyze memory samples for trends and anomalies
   */
  analyzeMemorySamples(samples) {
    if (samples.length < 2) {
      return { message: 'Insufficient samples for analysis' };
    }

    const heapUsedValues = samples.map(s => s.memory.heapUsed);
    const heapTotalValues = samples.map(s => s.memory.heapTotal);

    const analysis = {
      heapUsed: {
        min: Math.min(...heapUsedValues),
        max: Math.max(...heapUsedValues),
        avg: Math.round(heapUsedValues.reduce((a, b) => a + b) / heapUsedValues.length),
        trend: this.calculateTrend(heapUsedValues)
      },
      heapTotal: {
        min: Math.min(...heapTotalValues),
        max: Math.max(...heapTotalValues),
        avg: Math.round(heapTotalValues.reduce((a, b) => a + b) / heapTotalValues.length),
        trend: this.calculateTrend(heapTotalValues)
      },
      memoryLeaks: this.detectMemoryLeaks(samples),
      recommendations: this.generateRecommendations(samples)
    };

    return analysis;
  }

  /**
   * Utility methods
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  detectMemoryLeaks(samples) {
    // Simple leak detection: consistent growth over time
    const heapUsedValues = samples.map(s => s.memory.heapUsed);
    const trend = this.calculateTrend(heapUsedValues);
    
    if (trend === 'increasing') {
      const growth = heapUsedValues[heapUsedValues.length - 1] - heapUsedValues[0];
      const growthRate = growth / samples.length; // MB per sample
      
      return {
        suspected: growthRate > 1, // Growing more than 1MB per sample
        growthRate: `${growthRate.toFixed(2)} MB per sample`,
        totalGrowth: `${growth} MB`,
        recommendation: growthRate > 1 ? 'Investigate potential memory leak' : 'Normal growth pattern'
      };
    }
    
    return { suspected: false, recommendation: 'No memory leak detected' };
  }

  generateRecommendations(samples) {
    const recommendations = [];
    
    const avgHeapUsed = samples.reduce((sum, s) => sum + s.memory.heapUsed, 0) / samples.length;
    const maxHeapUsed = Math.max(...samples.map(s => s.memory.heapUsed));
    
    if (maxHeapUsed > 500) {
      recommendations.push('High memory usage detected (>500MB). Consider optimizing data structures.');
    }
    
    if (avgHeapUsed > 200) {
      recommendations.push('Average memory usage is high (>200MB). Monitor for memory leaks.');
    }
    
    const memoryGrowth = this.detectMemoryLeaks(samples);
    if (memoryGrowth.suspected) {
      recommendations.push('Potential memory leak detected. Take heap snapshots before and after operations.');
    }
    
    return recommendations.length > 0 ? recommendations : ['Memory usage appears normal'];
  }

  async checkClinicAvailability() {
    try {
      const { spawn } = require('child_process');
      const clinic = spawn('clinic', ['--version']);
      
      return new Promise((resolve) => {
        clinic.on('close', (code) => {
          resolve(code === 0);
        });
        clinic.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  async startBuiltinCPUProfiling(sessionId, options) {
    // Fallback CPU profiling using Node.js built-in profiler
    const inspector = require('inspector');
    const session = new inspector.Session();
    
    session.connect();
    
    await new Promise((resolve, reject) => {
      session.post('Profiler.enable', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      session.post('Profiler.start', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.sessions.cpu = {
      sessionId,
      startTime: Date.now(),
      session,
      status: 'running',
      method: 'builtin'
    };

    return {
      sessionId,
      status: 'started',
      method: 'Node.js built-in profiler',
      message: 'CPU profiling started with built-in profiler'
    };
  }

  async getProfileInfo(profilePath) {
    try {
      const stats = await fs.stat(profilePath);
      return {
        size: Math.round(stats.size / 1024 / 1024 * 100) / 100 + ' MB',
        created: stats.birthtime.toISOString(),
        path: profilePath
      };
    } catch {
      return null;
    }
  }

  /**
   * Get status of all profiling sessions
   */
  getProfilingStatus() {
    return {
      cpu: this.sessions.cpu ? {
        sessionId: this.sessions.cpu.sessionId,
        status: this.sessions.cpu.status,
        startTime: this.sessions.cpu.startTime,
        elapsed: Date.now() - this.sessions.cpu.startTime
      } : null,
      memory: this.sessions.memory ? {
        sessionId: this.sessions.memory.sessionId,
        status: this.sessions.memory.status,
        startTime: this.sessions.memory.startTime,
        sampleCount: this.sessions.memory.samples.length,
        elapsed: Date.now() - this.sessions.memory.startTime
      } : null,
      heap: {
        snapshotCount: this.sessions.heap.length,
        lastSnapshot: this.sessions.heap.length > 0 ? 
          this.sessions.heap[this.sessions.heap.length - 1].timestamp : null
      }
    };
  }

  /**
   * Cleanup old profile files
   */
  async cleanupOldProfiles(maxAgeDays = 7) {
    try {
      const files = await fs.readdir(this.profilesDir);
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.profilesDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} old profile files`);
      return { cleanedCount, message: `Removed ${cleanedCount} old profile files` };
      
    } catch (error) {
      console.error('Error cleaning up old profiles:', error);
      throw new Error(`Failed to cleanup old profiles: ${error.message}`);
    }
  }
}

// Create singleton instance
const profilingManager = new ProfilingManager();

module.exports = profilingManager;
