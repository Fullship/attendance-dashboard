module.exports = {
  apps: [
    // Backend API Server
    {
      name: 'attendance-backend',
      script: './backend/server-worker.js',
      
      // Instance configuration
      instances: 1, // Single instance for development, 'max' for production
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: '3002',
        ENABLE_CLUSTERING: 'false',
        FRONTEND_URL: 'http://localhost:3001'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3002',
        ENABLE_CLUSTERING: 'true',
        FRONTEND_URL: 'https://my.fullship.net'
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Set to true for development auto-reload
      max_memory_restart: '1G',
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      
      // Performance settings
      kill_timeout: 5000,
      listen_timeout: 8000,
      wait_ready: true
    },

    // Frontend React Development Server
    {
      name: 'attendance-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      
      // Instance configuration
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
        BROWSER: 'none',
        REACT_APP_API_URL: 'http://localhost:3002/api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3001',
        BROWSER: 'none',
        REACT_APP_API_URL: 'https://my.fullship.net/api'
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: '15s',
      
      // Logging
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      
      // Performance settings
      kill_timeout: 10000, // Frontend needs more time to shutdown
      listen_timeout: 30000 // React dev server takes longer to start
    },

    // MCP Bridge Server
    {
      name: 'attendance-mcp',
      script: './mcp-bridge/index.js',
      
      // Instance configuration
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: '3003',
        API_BASE_URL: 'http://localhost:3002'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3003',
        API_BASE_URL: 'http://localhost:3002'
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '5s',
      
      // Logging
      error_file: './logs/mcp-error.log',
      out_file: './logs/mcp-out.log',
      log_file: './logs/mcp-combined.log',
      time: true,
      merge_logs: true,
      
      // Performance settings
      kill_timeout: 3000,
      listen_timeout: 5000,
      wait_ready: true
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:Fullship/attendance-dashboard.git',
      path: '/var/www/attendance-dashboard',
      'post-deploy': 'npm install && npm run setup && npm run build && npm run build:mcp && pm2 startOrRestart ecosystem.unified.config.js --env production',
      'pre-setup': 'apt update && apt install git nodejs npm postgresql redis-server -y'
    },
    
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/staging',
      repo: 'git@github.com:Fullship/attendance-dashboard.git',
      path: '/var/www/attendance-dashboard-staging',
      'post-deploy': 'npm install && npm run setup && npm run build && npm run build:mcp && pm2 startOrRestart ecosystem.unified.config.js --env staging'
    }
  }
};
