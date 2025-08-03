#!/usr/bin/env node

/**
 * Comprehensive Performance Profiling Script
 *
 * This script orchestrates the complete performance analysis workflow:
 * 1. Starts the server with different Clinic.js profilers
 * 2. Runs load tests against the server
 * 3. Analyzes results and generates reports
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

class PerformanceProfiler {
  constructor() {
    this.serverProcess = null;
    this.loadTestProcess = null;
    this.currentProfiler = null;
  }

  async waitForServer(port = 3002, timeout = 30000) {
    console.log(`⏳ Waiting for server on port ${port}...`);

    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        await execAsync(`curl -s http://localhost:${port}/health || echo "not ready"`);
        console.log('✅ Server is ready!');
        return true;
      } catch (error) {
        // Server not ready, wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('❌ Server failed to start within timeout');
    return false;
  }

  async startServerWithProfiler(profilerType) {
    console.log(`🚀 Starting server with ${profilerType} profiler...`);

    const commands = {
      doctor: ['npx', 'clinic', 'doctor', '--', 'node', 'server.js'],
      flame: ['npx', 'clinic', 'flame', '--', 'node', 'server.js'],
      bubbleprof: ['npx', 'clinic', 'bubbleprof', '--', 'node', 'server.js'],
    };

    const command = commands[profilerType];
    if (!command) {
      throw new Error(`Unknown profiler type: ${profilerType}`);
    }

    this.currentProfiler = profilerType;

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn(command[0], command.slice(1), {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' },
      });

      let serverReady = false;

      this.serverProcess.stdout.on('data', data => {
        const output = data.toString();
        console.log(`📤 [${profilerType}] ${output.trim()}`);

        // Check if server started
        if (output.includes('Server running on') || output.includes('listening on')) {
          if (!serverReady) {
            serverReady = true;
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', data => {
        const output = data.toString();
        if (!output.includes('Warning') && !output.includes('DeprecationWarning')) {
          console.error(`❌ [${profilerType}] ${output.trim()}`);
        }
      });

      this.serverProcess.on('error', error => {
        console.error(`❌ Failed to start server with ${profilerType}:`, error.message);
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!serverReady) {
          console.log(`⏰ Server start timeout for ${profilerType}, proceeding anyway...`);
          resolve();
        }
      }, 10000);
    });
  }

  async runLoadTest(duration = 30) {
    console.log(`🔄 Running load test for ${duration} seconds...`);

    return new Promise((resolve, reject) => {
      const loadTestScript = path.join(__dirname, 'load-test.js');

      this.loadTestProcess = spawn('node', [loadTestScript], {
        env: {
          ...process.env,
          TEST_DURATION: duration.toString(),
          CONCURRENT_USERS: '5', // Reduced for profiling
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';

      this.loadTestProcess.stdout.on('data', data => {
        const text = data.toString();
        output += text;
        console.log(`📊 [LoadTest] ${text.trim()}`);
      });

      this.loadTestProcess.stderr.on('data', data => {
        console.error(`❌ [LoadTest] ${data.toString().trim()}`);
      });

      this.loadTestProcess.on('close', code => {
        if (code === 0) {
          console.log('✅ Load test completed successfully');
          resolve(output);
        } else {
          console.error(`❌ Load test failed with code ${code}`);
          reject(new Error(`Load test failed with code ${code}`));
        }
      });

      this.loadTestProcess.on('error', error => {
        console.error('❌ Load test error:', error.message);
        reject(error);
      });
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log(`🛑 Stopping server (${this.currentProfiler})...`);

      return new Promise(resolve => {
        this.serverProcess.on('close', () => {
          console.log(`✅ Server stopped (${this.currentProfiler})`);
          this.serverProcess = null;
          resolve();
        });

        // Send SIGINT to gracefully stop
        this.serverProcess.kill('SIGINT');

        // Force kill if not stopped within 10 seconds
        setTimeout(() => {
          if (this.serverProcess) {
            console.log('⚡ Force killing server...');
            this.serverProcess.kill('SIGKILL');
            this.serverProcess = null;
            resolve();
          }
        }, 10000);
      });
    }
  }

  async runSingleProfiler(profilerType, loadTestDuration = 30) {
    console.log(`\n🔍 === Running ${profilerType.toUpperCase()} Profiler ===`);

    try {
      // Start server with profiler
      await this.startServerWithProfiler(profilerType);

      // Wait for server to be ready
      await this.waitForServer();

      // Run load test
      await this.runLoadTest(loadTestDuration);

      // Stop server to generate profile
      await this.stopServer();

      console.log(`✅ ${profilerType} profiling completed`);

      // Give clinic time to process the data
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ Error during ${profilerType} profiling:`, error.message);
      await this.stopServer();
      throw error;
    }
  }

  async runAllProfilers() {
    const profilers = ['doctor', 'flame', 'bubbleprof'];
    const loadTestDuration = 30; // seconds per profiler

    console.log('🚀 Starting comprehensive performance profiling...');
    console.log(
      `📊 Will run ${profilers.length} profilers with ${loadTestDuration}s load tests each`
    );

    for (const profiler of profilers) {
      try {
        await this.runSingleProfiler(profiler, loadTestDuration);
      } catch (error) {
        console.error(`❌ Failed to run ${profiler} profiler:`, error.message);
        console.log('⏭️  Continuing with next profiler...');
      }

      // Wait between profilers
      if (profiler !== profilers[profilers.length - 1]) {
        console.log('⏸️  Waiting 10 seconds before next profiler...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log('\n✅ All profilers completed!');

    // Analyze results
    console.log('📊 Analyzing results...');
    try {
      const analyzeScript = path.join(__dirname, 'analyze-results.js');
      await execAsync(`node ${analyzeScript}`);
    } catch (error) {
      console.error('❌ Error analyzing results:', error.message);
    }
  }

  async cleanup() {
    if (this.serverProcess) {
      await this.stopServer();
    }
    if (this.loadTestProcess) {
      this.loadTestProcess.kill();
    }
  }
}

// CLI Usage
if (require.main === module) {
  const profiler = new PerformanceProfiler();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down profiler...');
    await profiler.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Shutting down profiler...');
    await profiler.cleanup();
    process.exit(0);
  });

  const command = process.argv[2];
  const profilerType = process.argv[3];

  if (command === 'single' && profilerType) {
    // Run single profiler
    profiler
      .runSingleProfiler(profilerType)
      .then(() => {
        console.log(`✅ ${profilerType} profiling completed`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Profiling failed:', error.message);
        process.exit(1);
      });
  } else if (command === 'analyze') {
    // Just analyze existing results
    const analyzeScript = path.join(__dirname, 'analyze-results.js');
    execAsync(`node ${analyzeScript}`)
      .then(() => console.log('✅ Analysis completed'))
      .catch(error => console.error('❌ Analysis failed:', error.message));
  } else {
    // Run all profilers
    profiler
      .runAllProfilers()
      .then(() => {
        console.log('🎉 Complete performance profiling finished!');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Profiling failed:', error.message);
        process.exit(1);
      });
  }
}
