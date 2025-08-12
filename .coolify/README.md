# Coolify Deployment Instructions

## Prerequisites
1. Access to Coolify instance
2. GitHub repository access (Fullship/attendance-dashboard)
3. Domain configured (my.fullship.net)

## Deployment Steps

### Step 1: Connect Repository
1. Log into your Coolify dashboard
2. Go to "Projects" → "New Project"
3. Select "Git Repository"
4. Connect to GitHub repository: `Fullship/attendance-dashboard`
5. Select branch: `main`

### Step 2: Configure Application
1. **Build Pack**: Select "Docker"
2. **Dockerfile Path**: `./Dockerfile` (root directory)
3. **Build Context**: `.` (root directory)
4. **Port**: `3002`

### Step 3: Add Environment Variables
Copy all variables from `.coolify/environment.template`:

```bash
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
REACT_APP_API_URL=http://my.fullship.net/api
DB_HOST=postgres
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=secure_password_2024
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-super-secret-session-key-change-in-production
TZ=UTC
LOG_LEVEL=info
```

### Step 4: Configure Domain
1. **Domain Settings**: Add `my.fullship.net`
2. **SSL**: Enable automatic SSL certificate
3. **HTTPS Redirect**: Enable

### Step 5: Add Databases
1. **PostgreSQL**:
   - Create new PostgreSQL service
   - Database: `attendance_dashboard`
   - User: `attendance_user`
   - Password: Use the same as DB_PASSWORD
   - Connect to main application

2. **Redis**:
   - Create new Redis service
   - Connect to main application

### Step 6: Deploy
1. Click "Deploy"
2. Monitor build logs
3. Verify health check at `https://my.fullship.net/health`

## Post-Deployment Verification
- [ ] Application accessible at https://my.fullship.net
- [ ] Health endpoint responding: https://my.fullship.net/health
- [ ] Database connection working
- [ ] Redis cache operational
- [ ] Frontend loading correctly
- [ ] API endpoints responding

## Troubleshooting
- Check build logs in Coolify dashboard
- Verify all environment variables are set
- Ensure domain DNS is properly configured
- Check database connection strings
