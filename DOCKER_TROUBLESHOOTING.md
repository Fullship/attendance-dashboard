# DOCKER BUILD TROUBLESHOOTING GUIDE

## Issue: Docker Build I/O Error

The Docker build is failing with "input/output error" during the image export phase. This is a common Docker Desktop issue.

## IMMEDIATE SOLUTIONS:

### Option 1: Use Existing Dockerfile
Since your existing `Dockerfile` is already working, use that for Coolify deployment:

**For Coolify:**
- Use the existing `Dockerfile` (not `Dockerfile.optimized`)
- It's already configured for your domain
- Should work without I/O issues

### Option 2: Docker Desktop Reset (If Needed)
If you need to fix Docker locally:

```bash
# Clean up Docker system
docker system prune -a --volumes -f

# Reset Docker Desktop if needed:
# Docker Desktop → Settings → Troubleshoot → Reset to factory defaults
```

### Option 3: Skip Local Testing
Since local Docker has issues, deploy directly to Coolify:
1. Push current code to GitHub
2. Use existing `Dockerfile` in Coolify
3. Configure environment variables per `DEPLOYMENT_GUIDE.md`

## COOLIFY DEPLOYMENT (RECOMMENDED)

### 1. Use Your Existing Dockerfile
Your current `Dockerfile` should work fine in Coolify:
- It's already optimized for your domain
- Has proper HTTP configuration
- Includes all necessary components

### 2. Coolify Configuration:
```yaml
Application Settings:
  Name: attendance-dashboard
  Domain: my.fullship.net  
  Build Method: Dockerfile
  Dockerfile Path: Dockerfile (existing one)
  Port: 3002
  SSL: Disabled
```

### 3. Environment Variables (Copy to Coolify):
```env
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
ENABLE_CLUSTERING=false
REACT_APP_API_URL=http://my.fullship.net/api

# Database (replace service names)
DB_HOST=your-postgres-service-name
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

# Redis (replace service name)
REDIS_HOST=your-redis-service-name
REDIS_PORT=6379

# Security (generate strong secrets)
JWT_SECRET=GENERATE_STRONG_32_CHAR_SECRET
SESSION_SECRET=GENERATE_STRONG_32_CHAR_SECRET
```

### 4. Services Setup:
1. **PostgreSQL Service** (postgres:15-alpine)
2. **Redis Service** (redis:7-alpine)  
3. **Main Application** (from your existing Dockerfile)

## TESTING ENDPOINTS

Once deployed to Coolify, test these URLs:

### ✅ Primary Tests:
- `http://my.fullship.net/` - Frontend
- `http://my.fullship.net/health` - Health check
- `http://my.fullship.net/api/auth/login` - API endpoint

### ✅ Expected Results:
- Frontend: React app loads
- Health: JSON status response
- API: JSON response (401/400 for auth, not 500/404)

## DATABASE SETUP

After deployment, connect to PostgreSQL and run:

```sql
-- Fix column naming issue we found earlier
ALTER TABLE users RENAME COLUMN password TO password_hash;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Insert admin user
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_admin) 
VALUES (
    'admin',
    'admin@company.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'Admin',
    'User',
    TRUE
) ON CONFLICT (email) DO NOTHING;
```

## SUMMARY

**Skip local Docker testing due to I/O issues**
**Deploy directly to Coolify using existing Dockerfile**
**Use the database setup commands above**
**Test via the URLs provided**

This approach bypasses the local Docker problems and gets you deployed faster.
