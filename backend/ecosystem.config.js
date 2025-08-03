module.exports = {
  "apps": [
    {
      "name": "attendance-dashboard",
      "script": "./cluster-server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "development",
        "ENABLE_CLUSTERING": "true",
        "PORT": "3002",
        "CLUSTER_MONITORING_PORT": "3003"
      },
      "env_production": {
        "NODE_ENV": "production",
        "ENABLE_CLUSTERING": "true",
        "PORT": "3002",
        "CLUSTER_MONITORING_PORT": "3003"
      },
      "env_staging": {
        "NODE_ENV": "staging",
        "ENABLE_CLUSTERING": "true",
        "PORT": "3002",
        "CLUSTER_MONITORING_PORT": "3003"
      },
      "max_memory_restart": "1G",
      "min_uptime": "10s",
      "max_restarts": 5,
      "restart_delay": 4000,
      "autorestart": true,
      "watch": false,
      "ignore_watch": [
        "node_modules",
        "logs",
        "uploads",
        ".git"
      ],
      "log_file": "./logs/pm2-combined.log",
      "out_file": "./logs/pm2-out.log",
      "error_file": "./logs/pm2-error.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
      "kill_timeout": 5000,
      "wait_ready": true,
      "listen_timeout": 10000,
      "shutdown_with_message": true
    },
    {
      "name": "attendance-dashboard-single",
      "script": "./server-worker.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "development",
        "ENABLE_CLUSTERING": "false",
        "PORT": "3002"
      },
      "env_production": {
        "NODE_ENV": "production",
        "ENABLE_CLUSTERING": "false",
        "PORT": "3002"
      },
      "max_memory_restart": "1G",
      "min_uptime": "10s",
      "max_restarts": 5,
      "restart_delay": 4000,
      "autorestart": true,
      "watch": false,
      "log_file": "./logs/pm2-single-combined.log",
      "out_file": "./logs/pm2-single-out.log",
      "error_file": "./logs/pm2-single-error.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "kill_timeout": 5000
    },
    {
      "name": "attendance-monitoring",
      "script": "./utils/monitoring-server.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "development",
        "PORT": "3004"
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": "3004"
      },
      "max_memory_restart": "256M",
      "min_uptime": "5s",
      "max_restarts": 3,
      "restart_delay": 2000,
      "autorestart": true,
      "watch": false,
      "log_file": "./logs/pm2-monitoring-combined.log",
      "out_file": "./logs/pm2-monitoring-out.log",
      "error_file": "./logs/pm2-monitoring-error.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z"
    }
  ],
  "deploy": {
    "production": {
      "user": "node",
      "host": "your-production-server.com",
      "ref": "origin/main",
      "repo": "git@github.com:your-username/attendance-dashboard.git",
      "path": "/var/www/attendance-dashboard",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production"
    },
    "staging": {
      "user": "node",
      "host": "your-staging-server.com",
      "ref": "origin/staging",
      "repo": "git@github.com:your-username/attendance-dashboard.git",
      "path": "/var/www/attendance-dashboard-staging",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env staging"
    }
  }
};
