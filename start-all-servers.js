#!/usr/bin/env node

/**
 * Unified Server Launcher for Attendance Dashboard
 * Starts Backend (port 3002), Frontend (port 3000), and MCP Server (port 3003) simultaneously
 * Handles port conflicts, environment setup, and graceful shutdown
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

// Color codes for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Server configurations
const servers = {
  backend: {
    name: 'Backend API',
    port: 3002,
    cwd: path.join(__dirname, 'backend'),
    command: 'node',
    args: ['server-worker.js'],
    env: { ...process.env, PORT: '3002', ENABLE_CLUSTERING: 'false' },
    color: colors.blue,
    icon: '🔧'
  },
  frontend: {
    name: 'Frontend React',
    port: 3000,
    cwd: path.join(__dirname, 'frontend'),
    command: 'npm',
    args: ['start'],
    env: { ...process.env, PORT: '3000', BROWSER: 'none' },
    color: colors.green,
    icon: '🌐'
  }
};

class UnifiedServerManager {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
    this.startupDelay = 2000; // 2 seconds between server starts
  }

  log(serverType, message, isError = false) {
    const server = servers[serverType];
    const timestamp = new Date().toLocaleTimeString();
    const color = isError ? colors.red : server.color;
    console.log(`${color}[${timestamp}] ${server.icon} ${server.name}: ${message}${colors.reset}`);
  }

  logGeneral(message, color = colors.cyan) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${color}[${timestamp}] 🚀 Manager: ${message}${colors.reset}`);
  }

  // Check if a port is available
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  // Kill any process using a specific port
  async killPortProcess(port) {
    return new Promise((resolve) => {
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          pids.forEach(pid => {
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              this.logGeneral(`Killed existing process ${pid} on port ${port}`, colors.yellow);
            } catch (e) {
              // Process might already be dead
            }
          });
        }
        resolve();
      });
    });
  }

  // Check and prepare environment
  async prepareEnvironment() {
    this.logGeneral('Preparing environment...', colors.yellow);

    // Ensure all required directories exist
    const requiredDirs = ['backend', 'frontend'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        throw new Error(`Required directory ${dir} does not exist`);
      }
    }

    // Check ports and kill conflicting processes
    for (const [serverType, config] of Object.entries(servers)) {
      const isAvailable = await this.isPortAvailable(config.port);
      if (!isAvailable) {
        this.logGeneral(`Port ${config.port} is in use, killing existing process...`, colors.yellow);
        await this.killPortProcess(config.port);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }

    this.logGeneral('Environment prepared successfully', colors.green);
  }


  // Start a single server
  async startServer(serverType) {
    const config = servers[serverType];
    
    this.log(serverType, `Starting on port ${config.port}...`);

    const serverProcess = spawn(config.command, config.args, {
      cwd: config.cwd,
      env: config.env,
      stdio: 'pipe'
    });

    // Handle process output
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        // Split multiline output
        output.split('\n').forEach(line => {
          if (line.trim()) {
            this.log(serverType, line.trim());
          }
        });
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        output.split('\n').forEach(line => {
          if (line.trim()) {
            this.log(serverType, line.trim(), true);
          }
        });
      }
    });

    serverProcess.on('close', (code) => {
      if (!this.isShuttingDown) {
        this.log(serverType, `Exited with code ${code}`, code !== 0);
        if (code !== 0) {
          this.logGeneral('A server crashed, shutting down all servers...', colors.red);
          this.shutdown();
        }
      }
    });

    serverProcess.on('error', (error) => {
      this.log(serverType, `Error: ${error.message}`, true);
    });

    this.processes.set(serverType, serverProcess);
    this.log(serverType, `Started with PID ${serverProcess.pid}`);

    // Wait for server to be ready (skip health check for frontend temporarily)
    if (serverType !== 'frontend') {
      await this.waitForServer(config.port, serverType);
    } else {
      // For frontend, wait a bit and then mark as ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.log(serverType, `Ready on port ${config.port} ✅ (health check skipped)`);
    }
  }

  // Wait for a server to be ready
  async waitForServer(port, serverType) {
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        let isReady = false;

        if (serverType === 'frontend') {
          // Use HTTP health check for React dev server
          isReady = await new Promise((resolve) => {
            const req = http.get(`http://localhost:${port}`, (res) => {
              resolve(res.statusCode === 200);
            });
            
            req.on('error', () => {
              resolve(false);
            });
            
            req.setTimeout(1000, () => {
              req.destroy();
              resolve(false);
            });
          });
        } else {
          // Use socket connection for backend/MCP servers
          isReady = await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            
            socket.on('connect', () => {
              socket.destroy();
              resolve(true);
            });
            
            socket.on('timeout', () => {
              socket.destroy();
              resolve(false);
            });
            
            socket.on('error', () => {
              socket.destroy();
              resolve(false);
            });
            
            socket.connect(port, 'localhost');
          });
        }

        if (isReady) {
          this.log(serverType, `Ready on port ${port} ✅`);
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Server ${serverType} failed to start on port ${port} within timeout`);
  }

  // Start all servers in sequence
  async startAllServers() {
    this.logGeneral('Starting all servers...', colors.bright);

    try {
      // Start backend first (APIs needed by frontend)
      await this.startServer('backend');
      await new Promise(resolve => setTimeout(resolve, this.startupDelay));

      // Start frontend
      await this.startServer('frontend');

      this.logGeneral('All servers started successfully! 🎉', colors.green);
      this.printStatusUrls();
    } catch (error) {
      this.logGeneral(`Failed to start servers: ${error.message}`, colors.red);
      await this.shutdown();
      process.exit(1);
    }
  }

  // Print access URLs
  printStatusUrls() {
    console.log(`\n${colors.bright}${colors.cyan}📊 Server Status:${colors.reset}`);
    console.log(`${colors.green}🌐 Frontend:  http://localhost:3000${colors.reset}`);
    console.log(`${colors.blue}🔧 Backend:   http://localhost:3002${colors.reset}`);
    console.log(`\n${colors.yellow}💡 Tips:${colors.reset}`);
    console.log(`  - Use Ctrl+C to stop all servers`);
    console.log(`  - Frontend will auto-reload on file changes`);
    console.log(`  - Backend logs show API requests`);
    console.log(`  - Frontend proxy routes /api to backend automatically\n`);
  }

  // Graceful shutdown
  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logGeneral('Shutting down all servers...', colors.yellow);

    for (const [serverType, process] of this.processes) {
      try {
        this.log(serverType, 'Stopping...');
        process.kill('SIGTERM');
        
        // Wait up to 5 seconds for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            process.kill('SIGKILL');
            resolve();
          }, 5000);
          
          process.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
        
        this.log(serverType, 'Stopped');
      } catch (error) {
        this.log(serverType, `Error stopping: ${error.message}`, true);
      }
    }

    this.logGeneral('All servers stopped', colors.green);
    process.exit(0);
  }

  // Setup signal handlers
  setupSignalHandlers() {
    process.on('SIGINT', () => {
      console.log('\n'); // New line after ^C
      this.logGeneral('Received SIGINT, shutting down...', colors.yellow);
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.logGeneral('Received SIGTERM, shutting down...', colors.yellow);
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      this.logGeneral(`Uncaught exception: ${error.message}`, colors.red);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      this.logGeneral(`Unhandled rejection: ${reason}`, colors.red);
      this.shutdown();
    });
  }
}

// Main execution
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('🚀 Attendance Dashboard - Unified Server Manager');
  console.log('===============================================');
  console.log(`${colors.reset}`);

  const manager = new UnifiedServerManager();
  manager.setupSignalHandlers();

  try {
    await manager.prepareEnvironment();
    await manager.startAllServers();
  } catch (error) {
    manager.logGeneral(`Startup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = UnifiedServerManager;
