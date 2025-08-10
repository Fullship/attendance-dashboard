# 🚨 Bad Gateway Error - Troubleshooting Guide

## Problem: 502 Bad Gateway Error

A "Bad Gateway" error (HTTP 502) typically indicates that nginx cannot connect to your backend service. Let's systematically troubleshoot this issue.

## Quick Diagnostic Commands

Run these commands to check the current status:

### 1. Check Container Status
```bash
# Check if containers are running
docker ps

# Check container logs
docker logs attendance-dashboard-backend-1
docker logs attendance-dashboard-nginx-1
```

### 2. Check Backend Health
```bash
# Test backend directly (if running locally)
curl http://localhost:3002/health

# Test through nginx
curl http://my.fullship.net/api/health
```

### 3. Check Nginx Configuration
```bash
# Test nginx config syntax
docker exec attendance-dashboard-nginx-1 nginx -t

# Check nginx error logs
docker logs attendance-dashboard-nginx-1 2>&1 | grep error
```

## Common Causes & Solutions

### 🔧 Cause 1: Backend Container Not Running

**Check:**
```bash
docker ps | grep backend
```

**Solution:**
```bash
# Restart the backend service
docker-compose -f docker-compose.prod.yml restart backend

# Or rebuild if needed
docker-compose -f docker-compose.prod.yml up --build backend
```

### 🔧 Cause 2: Wrong Backend Port Configuration

**Check nginx config:**
The nginx configuration should proxy to `http://backend:3002`

**Current config verification:**
```bash
grep -n "proxy_pass" nginx.prod.conf
```

### 🔧 Cause 3: Network Connectivity Issues

**Check Docker network:**
```bash
# List networks
docker network ls

# Inspect the network (usually named after the directory)
docker network inspect attendance-dashboard_default
```

**Solution:**
```bash
# Recreate network and containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### 🔧 Cause 4: Backend Application Crash

**Check backend logs:**
```bash
docker logs attendance-dashboard-backend-1 --tail 50
```

**Common backend issues:**
- Database connection failures
- Missing environment variables
- Redis connection timeouts
- Application startup errors

### 🔧 Cause 5: Environment Variables Missing

**Check if all required env vars are set:**
```bash
docker exec attendance-dashboard-backend-1 env | grep -E "(DATABASE_URL|REDIS|NODE_ENV)"
```

## Step-by-Step Debugging

### Step 1: Verify Services are Running
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Expected output should show both services as 'Up'
```

### Step 2: Test Backend Directly
```bash
# Get backend container IP
docker inspect attendance-dashboard-backend-1 | grep IPAddress

# Test health endpoint directly
curl http://[BACKEND_IP]:3002/health
```

### Step 3: Test Nginx Proxy
```bash
# Check nginx can reach backend
docker exec attendance-dashboard-nginx-1 curl http://backend:3002/health
```

### Step 4: Check Logs for Errors
```bash
# Backend application logs
docker logs attendance-dashboard-backend-1

# Nginx access and error logs
docker logs attendance-dashboard-nginx-1
```

## Quick Fix Commands

### Complete Service Restart
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Clean up any orphaned containers
docker system prune -f

# Start services fresh
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Backend-Only Restart
```bash
# Restart just the backend
docker-compose -f docker-compose.prod.yml restart backend

# Check backend health
sleep 10 && curl http://localhost:3002/health
```

## Emergency Fallback: Standalone Backend

If nginx continues to have issues, run backend standalone temporarily:

```bash
# Stop current services
docker-compose -f docker-compose.prod.yml down

# Run backend directly on port 80
docker run -d \
  --name attendance-backend-standalone \
  -p 80:3002 \
  -e NODE_ENV=production \
  -e PORT=3002 \
  -e FRONTEND_URL=https://my.fullship.net \
  attendance-dashboard-backend

# Test direct access
curl http://my.fullship.net/health
```

## Environment Variables Checklist

Ensure these are properly set in your production environment:

```bash
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://my.fullship.net
DATABASE_URL=your_postgres_connection_string
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

## After Fixing

Once the issue is resolved:

1. **Test all endpoints:**
   ```bash
   curl http://my.fullship.net/health
   curl http://my.fullship.net/api/health
   ```

2. **Monitor logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **Set up monitoring** to catch future issues early

---

**Created**: August 10, 2025
**Status**: Active troubleshooting guide
**Next**: Run diagnostics and apply appropriate solution 🔧
