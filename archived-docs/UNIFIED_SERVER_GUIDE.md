# 🚀 Unified Server Management Guide

This guide explains how to run all three servers (Backend, Frontend, MCP) simultaneously without conflicts.

## 📋 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   MCP Bridge    │
│   React App     │    │   Node.js API   │    │   HTTP Bridge   │
│   Port: 3001    │◄──►│   Port: 3002    │◄──►│   Port: 3003    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       │   Port: 5432    │
                       └─────────────────┘
```

## 🎯 Quick Start

### Option 1: Node.js Manager (Recommended for Development)
```bash
# Install dependencies and start all servers
npm run startup

# Or use the direct command
npm run dev
# or
npm start
```

### Option 2: PM2 Process Manager (Recommended for Production)
```bash
# Start with PM2
npm run startup:pm2

# Or for production
npm run startup:prod
```

### Option 3: Manual Startup Script
```bash
# Basic startup
./startup.sh

# With PM2
./startup.sh --pm2

# Production mode with PM2
./startup.sh --prod --pm2

# Skip dependency installation (faster subsequent runs)
./startup.sh --skip-deps

# Skip building MCP server
./startup.sh --skip-build
```

## 📊 Available Commands

### Development Commands
```bash
npm run dev                 # Start all servers with Node.js manager
npm run dev:unified         # Same as above (explicit)
npm run startup:dev         # Start with dependency checks
npm run unified:start       # Direct Node.js manager start
```

### Production Commands
```bash
npm run startup:prod        # Full production setup with PM2
npm run unified:pm2:prod    # PM2 production mode
```

### Individual Server Commands
```bash
npm run dev:backend         # Backend only
npm run dev:frontend        # Frontend only  
npm run dev:mcp             # MCP bridge only
npm run build:mcp           # Build MCP server TypeScript
```

### PM2 Management Commands
```bash
npm run pm2:status          # Show PM2 process status
npm run pm2:logs            # View all logs
npm run pm2:monitor         # Real-time monitoring dashboard
npm run pm2:restart         # Restart all processes
npm run pm2:stop            # Stop all processes
npm run unified:pm2         # Start with unified PM2 config
```

## 🔧 Server Details

### Backend Server (Port 3002)
- **Purpose**: REST API, Database operations, Authentication
- **Technology**: Node.js, Express, PostgreSQL
- **Features**: CORS configured for frontend, Socket.IO, Redis caching
- **Health Check**: `curl http://localhost:3002/api/health`

### Frontend Server (Port 3001)
- **Purpose**: React application, User interface
- **Technology**: React, Create React App
- **Features**: Proxy middleware routes `/api` to backend
- **Access**: `http://localhost:3001`

### MCP Bridge Server (Port 3003)
- **Purpose**: Model Context Protocol HTTP bridge
- **Technology**: Express, MCP SDK
- **Features**: Unified API abstraction, 25+ tools
- **Health Check**: `curl http://localhost:3003/health`

## 🛠️ Configuration Files

### Node.js Manager
- **File**: `start-all-servers.js`
- **Features**: Port conflict resolution, Graceful shutdown, Color-coded logging
- **Usage**: Automatic startup sequencing with health checks

### PM2 Configuration
- **File**: `ecosystem.unified.config.js`
- **Features**: Process management, Auto-restart, Log aggregation
- **Environments**: Development, Staging, Production

### Environment Variables
- **Backend**: `.env.local` in backend directory
- **Frontend**: Proxy configuration in `setupProxy.js`
- **MCP**: Environment passed through bridge configuration

## 🐛 Troubleshooting

### Port Conflicts
```bash
# The startup script automatically kills conflicting processes
# Or manually clear ports:
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
```

### CORS Issues
- Ensure `FRONTEND_URL` in `.env.local` includes `http://localhost:3001`
- Check proxy configuration in `frontend/src/setupProxy.js`

### Database Connection
```bash
# Check PostgreSQL status
pg_ctl status

# Start PostgreSQL (macOS)
brew services start postgresql

# Test connection
psql -h localhost -U postgres -d attendance_dashboard_dev
```

### MCP Build Issues
```bash
# Rebuild MCP server
cd mcp-server
npm run build
cd ..
```

### Dependencies Issues
```bash
# Reinstall all dependencies
./startup.sh --skip-build --skip-db-check
```

## 📋 Server Status Monitoring

### Real-time Monitoring
```bash
# Node.js Manager: Built-in color-coded console output
npm run dev

# PM2 Dashboard
npm run pm2:monitor

# Individual server logs
pm2 logs attendance-backend
pm2 logs attendance-frontend  
pm2 logs attendance-mcp
```

### Health Checks
```bash
# All servers health check
curl http://localhost:3001          # Frontend
curl http://localhost:3002/api/health # Backend  
curl http://localhost:3003/health     # MCP Bridge

# Database connection test
npm run db:test
```

## 🚀 Development Workflow

### Starting Fresh
```bash
# Full setup (first time or after major changes)
./startup.sh

# Quick start (dependencies already installed)
./startup.sh --skip-deps --skip-build
```

### Making Changes
- **Frontend**: Hot reload automatically enabled
- **Backend**: Restart with `pm2 restart attendance-backend` or use Node.js manager
- **MCP**: Rebuild with `npm run build:mcp` and restart

### Stopping Servers
```bash
# Node.js Manager: Ctrl+C (graceful shutdown)
# PM2: npm run pm2:stop
# Manual: ./startup.sh with Ctrl+C
```

## 🏭 Production Deployment

### PM2 Production Setup
```bash
# Start in production mode
npm run startup:prod

# Save PM2 process list
pm2 save

# Setup auto-start on system boot
pm2 startup
```

### Environment Configuration
- Set `NODE_ENV=production`
- Update `FRONTEND_URL` for production domain
- Configure database and Redis connections
- Setup reverse proxy (nginx)

## 📝 File Structure

```
attendance-dashboard/
├── start-all-servers.js         # Node.js unified manager
├── startup.sh                   # Complete setup script
├── ecosystem.unified.config.js  # PM2 configuration
├── backend/
│   ├── server-worker.js         # Backend entry point
│   └── package.json
├── frontend/
│   ├── src/setupProxy.js        # API routing
│   └── package.json
├── mcp-server/
│   ├── src/index.ts            # MCP server source
│   ├── dist/index.js           # Built MCP server
│   └── package.json
├── mcp-bridge/
│   ├── index.js                # HTTP bridge
│   └── package.json
└── logs/                       # Server logs (auto-created)
```

## 🎉 Success Indicators

When all servers start successfully, you should see:

```
🌐 Frontend:  http://localhost:3001 ✅
🔧 Backend:   http://localhost:3002 ✅
🔗 MCP API:   http://localhost:3003 ✅
```

- Frontend loads the login page
- Backend responds to API calls
- MCP bridge provides unified access
- No CORS errors in browser console
- Database queries work correctly

## 💡 Tips

1. **Use the startup script** for most reliable setup
2. **PM2 for production** and long-running development
3. **Node.js manager for quick development** with better logging
4. **Check logs directory** for persistent error tracking
5. **Use health checks** to verify server readiness
6. **Stop cleanly** to avoid port conflicts
