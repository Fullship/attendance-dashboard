# Coolify Deployment Fix - Docker Build Context Issue

## Problem Identified
The Docker build was failing with errors like:
```
ERROR: failed to calculate checksum of ref: "/frontend": not found
ERROR: failed to calculate checksum of ref: "/backend": not found
```

## Root Cause
1. **Complex multi-stage Dockerfile**: The original Dockerfile was using a complex multi-stage build that wasn't properly handling the build context.
2. **Missing dependencies**: The frontend build requires `openssl` for generating build hashes.
3. **Incorrect path assumptions**: The Dockerfile was making assumptions about directory structure that didn't match the actual project layout.

## Solution Implemented
Created a simplified, single-stage Dockerfile that:

### 1. Fixed Build Context Issues
- Uses simple `COPY` commands that work with Coolify's build context
- Installs dependencies in the correct order
- Properly handles the frontend build process

### 2. Added Required Dependencies
```dockerfile
RUN apk add --no-cache curl dumb-init openssl
```
- `openssl`: Required for frontend build hash generation
- `curl`: Required for health checks
- `dumb-init`: Proper process management in containers

### 3. Correct Frontend Build Process
```dockerfile
RUN cd frontend && \
    NODE_ENV=production \
    GENERATE_SOURCEMAP=false \
    REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    REACT_APP_BUILD_HASH=coolify-$(date +%s) \
    npm run build
```

### 4. Proper Static File Serving
- Set `SERVE_STATIC=true` environment variable
- Backend is configured to serve frontend files from `../frontend/build`
- No need to copy files to a separate `public` directory

### 5. Security and Performance
- Non-root user (`app:nodejs`)
- Single worker mode for containerized environment
- Proper health checks on port 3002

## Key Changes Made

### Updated Dockerfile
- Single-stage build instead of multi-stage
- Added `openssl` dependency
- Proper environment variables for frontend build
- Set `SERVE_STATIC=true` for backend
- Single worker mode (`ENABLE_CLUSTERING=false`)

### Cleaned .dockerignore
- Removed problematic exclusions
- Kept only necessary ignores (node_modules, logs, etc.)
- Ensured `frontend/` and `backend/` directories are included

## Deployment Instructions

1. **Commit Changes**:
   ```bash
   git add Dockerfile .dockerignore
   git commit -m "Fix Docker build context issues for Coolify deployment"
   git push
   ```

2. **Coolify Configuration**:
   - Port: `3002`
   - Health check endpoint: `/health`
   
3. **Required Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3002
   REDIS_HOST=your-redis-host-from-coolify
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password-from-coolify
   DATABASE_URL=your-postgres-connection-string
   ```

4. **Deploy**: Trigger a new deployment in Coolify

## Expected Outcome
- ✅ Docker build should complete successfully
- ✅ Container should start without errors
- ✅ Health checks should pass on port 3002
- ✅ Frontend should be served by the backend
- ✅ Redis connection should work with proper environment variables

## Testing
Run `./validate-dockerfile.sh` to verify all requirements are met before deployment.

## Files Modified
- `Dockerfile` - Simplified single-stage build
- `.dockerignore` - Cleaned up exclusions
- `validate-dockerfile.sh` - Added validation script

This fix addresses the Docker build context issues that were preventing successful deployment on Coolify.
