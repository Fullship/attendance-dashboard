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

> **🚨 QUICK FIX for "could not read Username" error**: Your repository might be private. Go to GitHub → Repository Settings → General → Danger Zone → "Change repository visibility" → "Change to public" before deploying.

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
2. **Repository Access**:
   - **If Public Repository**: Select **"Public Repository"**
   - **If Private Repository**: Select **"Private Repository (with Deploy Key)"** or **"GitHub App"**
3. **Repository URL**: `https://github.com/Fullship/attendance-dashboard`
4. **Branch**: `main`
5. **Build Pack**: Select **"Dockerfile"**

> **⚠️ Important**: If you get a "could not read Username" error during deployment, the repository might be private or require authentication. See troubleshooting section below.

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

> **Note**: If you're using a Coolify-generated domain for testing, update `REACT_APP_API_URL` to match your generated domain (e.g., `http://your-generated-domain.coolify.app/api`)

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
2. **Name**: `attendance-postgres` (this will be your service name)
3. **PostgreSQL Version**: `15` (if version selection is available)
4. **PostgreSQL Database**: `attendance_dashboard` (if separate field exists)
5. **PostgreSQL Username**: `attendance_user` (if available, otherwise uses default)
6. **PostgreSQL Password**: `secure_password_2024` (or generate a secure one)
7. Click **"Deploy"**

> **Note**: Coolify will automatically create a database with the same name as the service if no separate database name is specified. You may need to create the `attendance_dashboard` database and `attendance_user` manually after deployment.

#### 📄 Database Initialization:
After PostgreSQL is running, you'll need to set up the database and user:

**Option 1: Using Coolify's Database Terminal**
1. Go to your PostgreSQL service in Coolify
2. Click **"Terminal"** or **"Execute Command"**
3. Run these commands:
```sql
-- Connect as postgres superuser first
CREATE DATABASE attendance_dashboard;
CREATE USER attendance_user WITH PASSWORD 'secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE attendance_dashboard TO attendance_user;
\c attendance_dashboard;
GRANT ALL ON SCHEMA public TO attendance_user;
```

**Option 2: Upload init-database.sql**
1. In the PostgreSQL service, look for **"Volumes"** or **"Files"**
2. Upload the `init-database.sql` file to `/docker-entrypoint-initdb.d/`
3. Restart the PostgreSQL service to run initialization

**Option 3: Manual SQL Execution**
1. Copy the contents of `init-database.sql`
2. Use Coolify's database terminal to execute the SQL commands
3. This will create all tables and initial data

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
# The DB_HOST should match the "Name" you gave your PostgreSQL service
DB_HOST=attendance-postgres
REDIS_HOST=attendance-redis
REDIS_URL=redis://attendance-redis:6379

# If Coolify created a default database, you might need to adjust:
# DB_NAME=postgres (if default database name)
# DB_USER=postgres (if default user)
# Or keep as configured if you manually created the database and user:
DB_NAME=attendance_dashboard
DB_USER=attendance_user
```

### Step 9: Configure Domain
1. Go to your application configuration page
2. Find the **"Domains"** field in the General configuration section
3. **Option 1 - Use Custom Domain:**
   - Clear any auto-generated domain (like `c008s4ggwos404sk8wocsksk.45.136.18.66.sslip.io`)
   - Enter: `my.fullship.net`
   - **Important**: Make sure your DNS A record points to your Coolify server IP (`45.136.18.66`)
4. **Option 2 - Use Generated Domain (for testing):**
   - Click **"Generate Domain"** to get a random subdomain
   - Use this for initial testing, then switch to custom domain later
5. **SSL Configuration:**
   - ✅ **"Generate Let's Encrypt Certificate"** should be enabled (if available)
   - ✅ **"Force HTTPS Redirect"** should be enabled (if available)
6. Click **"Save"** or **"Update"**

> **Note**: If you're using a custom domain (`my.fullship.net`), ensure your domain's DNS A record points to your Coolify server's IP address (`45.136.18.66`) before deployment.

### Step 10: Deploy Application
1. Go back to your application
2. Click **"Deploy"** button
3. Monitor the build process in the **"Deployments"** tab
4. Build should take approximately 2-3 minutes

> **💡 Pro Tip**: If this is your first deployment, consider using a Coolify-generated domain initially to test everything works, then switch to your custom domain (`my.fullship.net`) once you've confirmed the application is working properly.

---

## 🔄 Switching from Generated Domain to Custom Domain

If you've already deployed with a generated domain (like `c008s4ggwos404sk8wocsksk.45.136.18.66.sslip.io`) and want to switch to `my.fullship.net`:

### Step 1: Configure DNS
1. **Set up DNS A Record**:
   - Go to your domain registrar (where you bought `my.fullship.net`)
   - Add/Edit DNS A Record:
     - **Name**: `my` (or `@` for root domain)
     - **Type**: `A`
     - **Value**: `45.136.18.66` (your Coolify server IP)
     - **TTL**: `300` (5 minutes)

### Step 2: Update Coolify Domain
1. In Coolify, go to your application
2. Find the **"Domains"** field
3. **Replace** the generated domain with: `my.fullship.net`
4. Click **"Save"**

### Step 3: Update Environment Variable
1. Go to **"Environment"** tab in your application
2. **Update** this variable:
   ```bash
   REACT_APP_API_URL=https://my.fullship.net/api
   ```
   (Change from the generated domain URL)
3. Click **"Save"**

### Step 4: Redeploy
1. Click **"Deploy"** to rebuild with new domain
2. Wait for deployment to complete
3. SSL certificate will be automatically generated for `my.fullship.net`

### Step 5: Verify
- Visit: `https://my.fullship.net`
- Check health: `https://my.fullship.net/health`
- Ensure no certificate errors

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

**Issue**: `fatal: could not read Username for 'https://github.com': No such device or address`
**Solution**:
This means Coolify cannot access your GitHub repository. Try these solutions:

1. **Check Repository Visibility**:
   - Go to `https://github.com/Fullship/attendance-dashboard/settings`
   - Under "General" → "Danger Zone" → check if repository is Private
   - If private, either make it public or set up authentication

2. **Make Repository Public** (Easiest Solution):
   - Go to repository Settings → General → Danger Zone
   - Click "Change repository visibility" → "Change to public"
   - Redeploy in Coolify

3. **Use Deploy Key** (For Private Repos):
   - In Coolify, when adding the repository, select "Private Repository (with Deploy Key)"
   - Copy the generated SSH public key
   - Go to GitHub repo → Settings → Deploy keys → Add deploy key
   - Paste the key and enable "Allow write access"
   - Redeploy in Coolify

4. **Use GitHub App** (Alternative):
   - In Coolify, select "GitHub App" when adding repository
   - Follow the OAuth flow to authenticate
   - Grant access to the specific repository

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
2. Check `DB_HOST` matches PostgreSQL service name exactly
3. Verify database credentials:
   - If using default Coolify setup: `DB_USER=postgres`, `DB_NAME=postgres`
   - If manually created: `DB_USER=attendance_user`, `DB_NAME=attendance_dashboard`
4. Check if database and user were created properly:
   ```sql
   -- Connect to PostgreSQL service terminal and run:
   \l -- List all databases
   \du -- List all users
   ```
5. Run database initialization script if tables are missing

**Issue**: Redis connection failed
**Solution**:
1. Verify Redis service is running
2. Check `REDIS_HOST` matches Redis service name
3. Verify `REDIS_URL` format: `redis://service-name:6379`

### 🔴 Domain Issues

**Issue**: Custom domain not accessible
**Solution**:
1. Verify DNS A record points to Coolify server IP:
   ```bash
   # Check DNS resolution
   nslookup my.fullship.net
   dig my.fullship.net A
   ```
2. Check if domain is properly entered in Coolify (no http:// prefix)
3. Try using a generated domain first to test the application
4. Ensure domain propagation is complete (can take up to 24 hours)

**Issue**: Generated domain works but custom domain doesn't
**Solution**:
1. **DNS Issue**: Check your domain registrar settings
   ```bash
   # Verify DNS propagation
   nslookup my.fullship.net
   # Should return: 45.136.18.66
   ```
2. **Environment Variable**: Update `REACT_APP_API_URL` to match your actual domain
3. **Domain Format**: Ensure you entered `my.fullship.net` (no http:// prefix)
4. **Wait for Propagation**: DNS changes can take 5-60 minutes
5. **Redeploy**: Always redeploy after changing environment variables

**Issue**: "This site can't be reached" or DNS errors
**Solution**:
1. **Check DNS Setup**:
   - Verify A record points to `45.136.18.66`
   - Wait for DNS propagation (use `dig my.fullship.net` to check)
2. **Try Different DNS**: Use `8.8.8.8` or `1.1.1.1` temporarily
3. **Clear DNS Cache**: 
   ```bash
   # On Mac/Linux
   sudo dscacheutil -flushcache
   # On Windows
   ipconfig /flushdns
   ```

**Issue**: SSL certificate not working
**Solution**:
1. Wait a few minutes for Let's Encrypt provisioning
2. Check domain DNS propagation
3. Verify domain is accessible from internet
4. Try using HTTP first, then enable HTTPS once domain is working

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