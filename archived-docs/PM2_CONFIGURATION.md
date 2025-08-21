# PM2 Cluster Configuration Guide

## 🚀 Overview
PM2 (Process Manager 2) configuration for the Attendance Dashboard with cluster mode, automatic CPU detection, and robust failure recovery.

## 📊 Configuration Summary

### Main API Server (`attendance-dashboard-api`)
- **Cluster Mode**: Enabled with `instances: 0` (auto-detects all CPU cores)
- **Memory Limit**: 2GB per instance
- **Auto Restart**: Enabled with exponential backoff
- **Max Restarts**: 10 attempts within the restart window
- **Min Uptime**: 10 seconds before considering successful

### Background Worker (`attendance-dashboard-worker`)
- **Fork Mode**: Single instance for background tasks
- **Memory Limit**: 1GB
- **Scheduled Tasks**: Cache cleanup, database maintenance, metrics
- **Cron Restart**: Daily at 3 AM for maintenance

## 🛠️ Installation & Setup

### 1. Install PM2 Globally
```bash
npm install -g pm2
```

### 2. Install Dependencies
```bash
cd backend
npm install  # This will install node-cron and other dependencies
```

### 3. Create Required Directories
```bash
mkdir -p logs backups
```

## 📋 Usage Commands

### Quick Start
```bash
# Start all applications
npm run pm2:start

# Start in production mode
npm run pm2:start-prod

# Check status
npm run pm2:status
```

### Using the PM2 Manager Script
```bash
# Start applications
./pm2-manager.sh start

# View status
./pm2-manager.sh status

# Monitor in real-time
./pm2-manager.sh monitor

# View logs
./pm2-manager.sh logs

# Health check
./pm2-manager.sh health

# Zero-downtime reload
./pm2-manager.sh reload
```

### Direct PM2 Commands
```bash
# Start from ecosystem config
pm2 start ecosystem.config.js

# Start production environment
pm2 start ecosystem.config.js --env production

# Monitor dashboard
pm2 monit

# View logs
pm2 logs

# Restart specific app
pm2 restart attendance-dashboard-api

# Scale to 4 instances
pm2 scale attendance-dashboard-api 4
```

## 🔧 Configuration Details

### Cluster Mode Benefits
- **Load Distribution**: Requests distributed across CPU cores
- **High Availability**: If one process crashes, others continue
- **Zero Downtime**: Reload processes without service interruption
- **Automatic Scaling**: Adapts to server CPU count

### Restart Strategies
1. **Exponential Backoff**: Delays between restarts increase exponentially
2. **Memory Monitoring**: Auto-restart if memory exceeds 2GB
3. **Health Checks**: Minimum 10s uptime before success
4. **Max Attempts**: Stop trying after 10 failed restarts

### Error Handling
- **Graceful Shutdown**: 5-second timeout for cleanup
- **Log Rotation**: Automatic log file management
- **Error Isolation**: Worker failures don't affect API server

## 📊 Monitoring & Debugging

### Real-time Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# Process status
pm2 status

# Detailed process info
pm2 info attendance-dashboard-api
```

### Log Management
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs attendance-dashboard-api

# Clear logs
pm2 flush

# Log files location
./logs/pm2-*.log
```

### Performance Metrics
```bash
# Show performance stats
./pm2-manager.sh perf

# Memory usage
pm2 describe attendance-dashboard-api | grep memory

# CPU usage
pm2 describe attendance-dashboard-api | grep cpu
```

## 🔄 Background Tasks

The worker process handles scheduled tasks:

### Cache Cleanup (Every 6 hours)
- Removes expired Redis sessions
- Cleans temporary cache entries
- Optimizes memory usage

### Database Maintenance (Daily at 2 AM)  
- Archives old attendance records
- Optimizes database tables
- Generates analytics reports

### Metrics Generation (Every 15 minutes)
- Collects performance metrics
- Stores data for monitoring
- Tracks system health

### Log Cleanup (Weekly on Sunday at 3 AM)
- Removes old log files (30+ days)
- Prevents disk space issues
- Maintains clean environment

## 🚨 Production Deployment

### Auto-start on System Boot
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions to enable auto-start
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production
PORT=3002
ENABLE_WORKER_HTTP=true
WORKER_PORT=3003
```

### Health Checks
```bash
# API health endpoint
curl http://localhost:3002/api/health

# Worker health endpoint (if enabled)
curl http://localhost:3003/health

# PM2 health check
./pm2-manager.sh health
```

## 🛡️ Security Considerations

### Process Isolation
- API and worker run as separate processes
- Memory limits prevent resource exhaustion
- Automatic restart on failures

### Log Security
- Logs stored in dedicated directory
- Automatic cleanup prevents disk filling
- Timestamps for audit trails

### Resource Limits
- Memory limits: API (2GB), Worker (1GB)
- CPU usage monitoring
- Automatic process recycling

## 🔧 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory usage
pm2 describe attendance-dashboard-api | grep memory

# Restart if needed
pm2 restart attendance-dashboard-api
```

#### Process Not Starting
```bash
# Check logs for errors
pm2 logs attendance-dashboard-api --lines 50

# Verify configuration
pm2 prettylist
```

#### Port Conflicts
```bash
# Check if port is in use
lsof -i :3002

# Kill conflicting processes
pm2 delete all
```

### Recovery Procedures

#### Complete System Recovery
```bash
# Stop all processes
pm2 kill

# Restart from configuration
pm2 start ecosystem.config.js --env production

# Restore from backup if needed
pm2 resurrect
```

## 📈 Performance Optimization

### Scaling Strategies
```bash
# Scale to specific number of instances
pm2 scale attendance-dashboard-api 8

# Scale based on CPU usage
pm2 install pm2-auto-pull
```

### Memory Optimization
- Regular process restarts via cron
- Memory limits with automatic restart
- Garbage collection monitoring

### Load Balancing
- Round-robin distribution (default)
- Session affinity if needed
- Health-based routing

## 🎯 Best Practices

1. **Monitor Regularly**: Use `pm2 monit` for real-time monitoring
2. **Log Analysis**: Regular log review for issues
3. **Resource Planning**: Monitor CPU/memory usage patterns
4. **Backup Strategy**: Regular PM2 configuration backups
5. **Update Process**: Use zero-downtime reload for updates

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Start all apps |
| `pm2 stop all` | Stop all apps |
| `pm2 restart all` | Restart all apps |
| `pm2 reload all` | Zero-downtime reload |
| `pm2 delete all` | Delete all apps |
| `pm2 monit` | Monitoring dashboard |
| `pm2 logs` | View logs |
| `pm2 save` | Save process list |
| `pm2 resurrect` | Restore processes |
| `pm2 startup` | Auto-start setup |

## 🎉 Summary

✅ **Cluster Mode**: Automatic CPU detection with `instances: 0`  
✅ **Auto Restart**: Exponential backoff on failures  
✅ **Memory Management**: 2GB limit with auto-restart  
✅ **Background Tasks**: Scheduled maintenance and cleanup  
✅ **Zero Downtime**: Hot reload capabilities  
✅ **Comprehensive Logging**: Structured log management  
✅ **Health Monitoring**: Built-in health checks  
✅ **Production Ready**: Auto-start and recovery features
