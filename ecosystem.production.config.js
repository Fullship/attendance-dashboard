module.exports = {
  apps: [
    {
      name: 'attendance-dashboard-api',
      script: './backend/server.js',
      
      // Production configuration
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        FRONTEND_URL: 'https://i.fullship.net',
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      
      // Performance
      kill_timeout: 5000,
      listen_timeout: 8000,
      instance_var: 'INSTANCE_ID',
    }
  ]
};
