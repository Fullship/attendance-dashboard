const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PortManager {
  constructor() {
    this.backendDir = path.join(__dirname);
    this.frontendDir = path.join(__dirname, '../frontend');
    this.preferredBackendPort = 3001;
    this.preferredFrontendPort = 3000;
    this.portRange = { min: 3000, max: 3999 };
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

  // Find next available port starting from a given port
  async findAvailablePort(startPort = this.preferredBackendPort) {
    for (let port = startPort; port <= this.portRange.max; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found in range ${this.portRange.min}-${this.portRange.max}`);
  }

  // Update .env file with new port values
  updateEnvFile(filePath, updates) {
    if (!fs.existsSync(filePath)) {
      console.log(`Creating new .env file: ${filePath}`);
      const content = Object.entries(updates).map(([key, value]) => `${key}=${value}`).join('\\n');
      fs.writeFileSync(filePath, content + '\\n');
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `${key}=${value}\\n`;
      }
    });
    
    fs.writeFileSync(filePath, content);
  }

  // Kill processes on specific ports
  async killPortProcesses(ports) {
    for (const port of ports) {
      try {
        const { exec } = require('child_process');
        await new Promise((resolve) => {
          exec(`lsof -ti :${port} | xargs kill -9`, (error) => {
            // Ignore errors - port might not be in use
            resolve();
          });
        });
      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Start backend server
  startBackendServer(port) {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting backend server on port ${port}...`);
      
      const serverProcess = spawn('node', ['server.js'], {
        cwd: this.backendDir,
        stdio: 'pipe',
        env: { ...process.env, PORT: port }
      });

      let started = false;
      
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Backend] ${output.trim()}`);
        
        if (output.includes('Server running on port') && !started) {
          started = true;
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`);
      });

      serverProcess.on('error', (error) => {
        if (!started) {
          reject(error);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          reject(new Error('Backend server failed to start within 10 seconds'));
        }
      }, 10000);
    });
  }

  // Start frontend server
  startFrontendServer(port) {
    return new Promise((resolve, reject) => {
      console.log(`🎨 Starting frontend server on port ${port}...`);
      
      const frontendProcess = spawn('npm', ['start'], {
        cwd: this.frontendDir,
        stdio: 'pipe',
        env: { ...process.env, PORT: port }
      });

      let started = false;
      
      frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Frontend] ${output.trim()}`);
        
        if (output.includes('webpack compiled successfully') && !started) {
          started = true;
          resolve(frontendProcess);
        }
      });

      frontendProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error(`[Frontend Error] ${errorOutput.trim()}`);
        
        // Check for port conflict
        if (errorOutput.includes('Something is already running on port')) {
          if (!started) {
            reject(new Error('Frontend port conflict detected'));
          }
        }
      });

      frontendProcess.on('error', (error) => {
        if (!started) {
          reject(error);
        }
      });

      // Timeout after 30 seconds (frontend takes longer to start)
      setTimeout(() => {
        if (!started) {
          reject(new Error('Frontend server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  // Main method to setup and start both servers
  async setupAndStart() {
    try {
      console.log('🔍 Scanning for available ports...');
      
      // Find available ports
      const backendPort = await this.findAvailablePort(this.preferredBackendPort);
      const frontendPort = await this.findAvailablePort(this.preferredFrontendPort);
      
      console.log(`✅ Found available ports: Backend=${backendPort}, Frontend=${frontendPort}`);
      
      // Kill any existing processes on these ports
      await this.killPortProcesses([backendPort, frontendPort]);
      
      // Update backend .env
      const backendEnvPath = path.join(this.backendDir, '.env');
      this.updateEnvFile(backendEnvPath, {
        PORT: backendPort,
        FRONTEND_URL: `http://localhost:${frontendPort}`
      });
      
      // Update frontend .env
      const frontendEnvPath = path.join(this.frontendDir, '.env');
      this.updateEnvFile(frontendEnvPath, {
        PORT: frontendPort,
        REACT_APP_API_URL: `http://localhost:${backendPort}/api`
      });
      
      console.log('📝 Updated .env files with new port configurations');
      console.log(`   Backend: PORT=${backendPort}, FRONTEND_URL=http://localhost:${frontendPort}`);
      console.log(`   Frontend: PORT=${frontendPort}, REACT_APP_API_URL=http://localhost:${backendPort}/api`);
      
      // Start backend server
      const backendProcess = await this.startBackendServer(backendPort);
      console.log(`✅ Backend server started successfully on port ${backendPort}`);
      
      // Wait a moment before starting frontend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start frontend server
      const frontendProcess = await this.startFrontendServer(frontendPort);
      console.log(`✅ Frontend server started successfully on port ${frontendPort}`);
      
      console.log('\\n🎉 Both servers are running successfully!');
      console.log(`📱 Frontend: http://localhost:${frontendPort}`);
      console.log(`🔧 Backend API: http://localhost:${backendPort}/api`);
      console.log(`💬 Socket.IO: http://localhost:${backendPort}`);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\\n🛑 Shutting down servers...');
        backendProcess.kill('SIGTERM');
        frontendProcess.kill('SIGTERM');
        process.exit(0);
      });
      
      return { backendPort, frontendPort, backendProcess, frontendProcess };
      
    } catch (error) {
      console.error('❌ Error setting up servers:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const portManager = new PortManager();
  portManager.setupAndStart();
}

module.exports = PortManager;
