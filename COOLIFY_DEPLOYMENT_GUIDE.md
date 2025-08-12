# 🚀 Coolify Deployment Guide - Attendance Dashboard

## 📋 Overview
This guide will walk you through deploying the Attendance Dashboard to Coolify with the domain `my.fullship.net`.

## ✅ Pre-Deployment Checklist
- [x] Repository: `Fullship/attendance-dashboard` (ready)
- [x] Dockerfile: Production-optimized multi-stage build
- [x] Environment: Configured for my.fullship.net domain
- [x] Database: PostgreSQL with initialization script
- [x] Cache: Redis integration ready
- [x] Build tested locally

---

## 🎯 Step-by-Step Deployment

### Step 1: Access Coolify Dashboard
1. Open your Coolify instance in browser
2. Log in with your credentials
3. Navigate to the main dashboard

### Step 2: Create New Project
1. Click **"+ New Project"**
2. Project Name: `Attendance Dashboard`
3. Description: `Employee attendance tracking system`
4. Click **"Create Project"**

### Step 3: Add Application from Git Repository
1. In your project, click **"+ New Resource"** → **"Application"**
2. Select **"Public Repository"**
3. **Repository URL**: `https://github.com/Fullship/attendance-dashboard`
4. **Branch**: `main`
5. **Build Pack**: Select **"Dockerfile"**
6. Click **"Continue"**

### Step 4: Configure Build Settings
1. **Application Name**: `attendance-app`
2. **Dockerfile Location**: `./Dockerfile`
3. **Build Context**: `.` (root directory)
4. **Port**: `3002`
5. **Health Check URL**: `/health`
6. **Health Check Port**: `3002`

### Step 5: Environment Variables
Go to **"Environment"** tab and add these variables:

#### 🔧 Required Application Variables:
```bash
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
REACT_APP_API_URL=http://my.fullship.net/api
TZ=UTC
LOG_LEVEL=info
```

#### 🔐 Security Variables (CHANGE THESE!):
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production-123456789
SESSION_SECRET=your-super-secret-session-key-change-in-production-123456789
```

#### 📊 Database Variables (will be updated after creating DB service):
```bash
DB_HOST=postgres
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=secure_password_2024
DB_SSL=false
```

#### 🗄️ Redis Variables (will be updated after creating Redis service):
```bash
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
```

### Step 6: Add PostgreSQL Database
1. Click **"+ New Resource"** → **"Database"** → **"PostgreSQL"**
2. **Service Name**: `attendance-postgres`
3. **PostgreSQL Version**: `15`
4. **Database Name**: `attendance_dashboard`
5. **Username**: `attendance_user`
6. **Password**: `secure_password_2024` (or generate a secure one)
7. **Port**: `5432`
8. Click **"Deploy"**

#### 📄 Database Initialization:
After PostgreSQL is running:
1. Go to the database service
2. Click **"Execute Command"**
3. Upload or paste the contents of `init-database.sql`
4. Or connect via Adminer/pgAdmin and run the initialization script

### Step 7: Add Redis Cache
1. Click **"+ New Resource"** → **"Database"** → **"Redis"**
2. **Service Name**: `attendance-redis`
3. **Redis Version**: `7`
4. **Port**: `6379`
5. Leave other settings as default
6. Click **"Deploy"**

### Step 8: Update Database Connection Variables
After both database services are created, update these environment variables in your application:

```bash
# Update these with the actual service names from Coolify
DB_HOST=attendance-postgres
REDIS_HOST=attendance-redis
REDIS_URL=redis://attendance-redis:6379
```

### Step 9: Configure Domain
1. Go to your application settings
2. Navigate to **"Domains"** tab
3. Click **"+ Add Domain"**
4. **Domain**: `my.fullship.net`
5. Enable **"Generate Let's Encrypt Certificate"**
6. Enable **"Force HTTPS Redirect"**
7. Click **"Save"**

### Step 10: Deploy Application
1. Go back to your application
2. Click **"Deploy"** button
3. Monitor the build process in the **"Deployments"** tab
4. Build should take approximately 2-3 minutes

---

## 🔍 Post-Deployment Verification

### ✅ Health Check
Visit: `https://my.fullship.net/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-12T...",
  "worker": {
    "id": "single",
    "pid": 8,
    "clustered": false,
    "uptime": 123.456
  },
  "version": "1.0.0",
  "environment": "production",
  "monitoring": {
    "requestInstrumentation": true,
    "memoryMonitoring": true,
    "cachingEnabled": true
  }
}
```

### ✅ Frontend Access
Visit: `https://my.fullship.net`
- React application should load
- Login page should be accessible
- No console errors in browser developer tools

### ✅ Service Connectivity
Check in Coolify logs that services are connected:
- PostgreSQL connection successful
- Redis cache connected
- No database connection errors

---

## 🛠️ Troubleshooting

### 🔴 Build Failures

**Issue**: Docker build fails
**Solution**:
1. Check build logs in Coolify
2. Verify Dockerfile syntax
3. Ensure all required files are in repository

**Issue**: Frontend build fails
**Solution**:
1. Check if `frontend/package.json` exists
2. Verify Node.js version compatibility
3. Check for missing dependencies

### 🔴 Runtime Issues

**Issue**: 502 Bad Gateway
**Solution**:
1. Check application logs
2. Verify PORT environment variable is set to 3002
3. Ensure health check endpoint `/health` is accessible

**Issue**: Database connection failed
**Solution**:
1. Verify PostgreSQL service is running
2. Check `DB_HOST` matches PostgreSQL service name
3. Verify database credentials
4. Run database initialization script

**Issue**: Redis connection failed
**Solution**:
1. Verify Redis service is running
2. Check `REDIS_HOST` matches Redis service name
3. Verify `REDIS_URL` format: `redis://service-name:6379`

### 🔴 Domain Issues

**Issue**: Domain not accessible
**Solution**:
1. Verify DNS records point to Coolify server
2. Check SSL certificate status
3. Ensure domain is properly configured in Coolify

**Issue**: SSL certificate not working
**Solution**:
1. Wait a few minutes for Let's Encrypt provisioning
2. Check domain DNS propagation
3. Verify domain is accessible from internet

---

## 📊 Performance Monitoring

### Application Metrics
- **Health Endpoint**: `https://my.fullship.net/health`
- **Response Time**: Should be < 200ms
- **Memory Usage**: ~100-150MB per worker
- **CPU Usage**: Low under normal load

### Database Performance
- **Connection Pool**: Monitor active connections
- **Query Performance**: Check slow query logs
- **Storage**: Monitor disk usage

### Redis Cache
- **Hit Rate**: Monitor cache effectiveness
- **Memory Usage**: Keep under allocated limits
- **Connection Count**: Monitor active connections

---

## 🔧 Environment Variables Reference

### Complete Environment Configuration:
```bash
# Application
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
TZ=UTC
LOG_LEVEL=info

# Frontend
REACT_APP_API_URL=http://my.fullship.net/api

# Database
DB_HOST=attendance-postgres
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=secure_password_2024
DB_SSL=false

# Redis
REDIS_HOST=attendance-redis
REDIS_PORT=6379
REDIS_URL=redis://attendance-redis:6379

# Security (CHANGE THESE!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Optional
CLUSTER_MODE=false
WORKER_PROCESSES=1
MAX_MEMORY=512MB
```

---

## 📞 Support

### Getting Help:
1. **Coolify Documentation**: Check official Coolify docs
2. **Application Logs**: Monitor in Coolify dashboard
3. **Health Endpoint**: Use `/health` for diagnostics
4. **Database Logs**: Check PostgreSQL service logs

### Common Commands for Debugging:
```bash
# Check application health
curl https://my.fullship.net/health

# Test database connection (from app container)
pg_isready -h attendance-postgres -U attendance_user

# Test Redis connection (from app container)
redis-cli -h attendance-redis ping
```

---

## 🎉 Success!

If all steps completed successfully, your Attendance Dashboard should be:
- ✅ Accessible at `https://my.fullship.net`
- ✅ Health check responding at `https://my.fullship.net/health`
- ✅ Database connected and initialized
- ✅ Redis cache operational
- ✅ SSL certificate active
- ✅ All services running smoothly

**Welcome to your production Attendance Dashboard! 🎊**

---
*Last Updated: August 12, 2025*  
*Repository: https://github.com/Fullship/attendance-dashboard*  
*Domain: https://my.fullship.net*