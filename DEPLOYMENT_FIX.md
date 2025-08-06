# Quick Coolify Deployment Fix

## Issue Resolution
The deployment failed because Coolify couldn't find a `Dockerfile` in the root directory.

## ✅ Fixed Files:
1. **`Dockerfile`** - Simple single-container approach
2. **`Dockerfile.frontend`** - Separate frontend container
3. **`Dockerfile.backend`** - Separate backend container
4. **`docker-compose.separate.yml`** - For separate container deployment

## 🚀 Deployment Options:

### Option 1: Single Container (Simple)
Use the main `Dockerfile` in the root directory:
- ✅ **File**: `Dockerfile` (already in root)
- ✅ **Type**: Single container with nginx + Node.js
- ✅ **Ports**: 80 (frontend) and 3002 (backend)

### Option 2: Separate Containers (Recommended)
Use `docker-compose.separate.yml`:
- ✅ **Frontend**: `Dockerfile.frontend`
- ✅ **Backend**: `Dockerfile.backend`
- ✅ **Better separation and scaling**

## 🔧 Coolify Setup:

### For Single Container:
1. **Resource Type**: Docker Image
2. **Dockerfile**: `Dockerfile` (root directory)
3. **Port**: 80
4. **Health Check**: `/health`

### For Separate Containers:
1. **Resource Type**: Docker Compose
2. **Compose File**: `docker-compose.separate.yml`
3. **Frontend Port**: 80
4. **Backend Port**: 3002

## 📋 Environment Variables:
```bash
# Application
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Database
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=your-super-secret-jwt-key
```

## 🏃‍♂️ Quick Deploy:
1. **Push code** to your repository
2. **Create resource** in Coolify
3. **Select approach** (single container or compose)
4. **Set environment variables**
5. **Deploy** 🚀

The health endpoints are already configured:
- Frontend: `http://your-domain/health`
- Backend: `http://your-domain:3002/health` (or `/api/health`)

Ready to redeploy! 🎉
