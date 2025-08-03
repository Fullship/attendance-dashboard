module.exports = {
  apps: [
    {
      // Backend API Server
      name: 'attendance-dashboard-api',
      script: './backend/server.js',
      cwd: '/Users/salarjirjees/Desktop/myrecipe/attendance-dashboard',
      
      // Cluster mode configuration
      instances: 0, // Use all available CPU cores (0 = max CPUs)
      exec_mode: 'cluster',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      
      // Automatic restart configuration
      autorestart: true,
      watch: false, // Disable in production for performance
      max_memory_restart: '2G', // Restart if memory usage exceeds 2GB
      restart_delay: 5000, // Wait 5 seconds before restart
      max_restarts: 10, // Maximum restarts within restart_window
      min_uptime: '10s', // Minimum uptime before considering successful
      
      // Error handling
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // Add timestamp to logs
      
      // Advanced restart options
      exponential_backoff_restart_delay: 100, // Exponential backoff for restarts
      
      // Health monitoring
      kill_timeout: 5000, // Time to wait for graceful shutdown
      listen_timeout: 8000, // Time to wait for app to listen
      
      // Load balancing (for cluster mode)
      instance_var: 'INSTANCE_ID',
      
      // Source map support
      source_map_support: true,
      
      // Additional node args
      node_args: [
        '--max-old-space-size=2048', // Set max heap size to 2GB
        '--enable-source-maps'
      ],
    },
    
    // Optional: Separate process for database monitoring/cleanup tasks
    {
      name: 'attendance-dashboard-worker',
      script: './backend/worker.js', // We'll create this for background tasks
      cwd: '/Users/salarjirjees/Desktop/myrecipe/attendance-dashboard',
      
      // Single instance for worker tasks
      instances: 1,
      exec_mode: 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'background-tasks',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background-tasks',
      },
      
      // Restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 10000, // Longer delay for worker processes
      max_restarts: 5,
      min_uptime: '30s',
      
      // Cron-like restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Logging
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
    }
  ],

  // Global PM2 settings
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'], // Replace with your server
      ref: 'origin/main',
      repo: 'git@github.com:your-username/attendance-dashboard.git', // Replace with your repo
      path: '/var/www/attendance-dashboard',
      'post-deploy': 'npm install && npm run build:prod && pm2 startOrRestart ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};
