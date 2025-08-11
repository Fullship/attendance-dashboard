# ✅ Coolify Deployment Checklist
*Complete verification steps for fresh deployment*

## 🎯 Pre-Deployment Checklist

### Repository Status ✅
- [x] **All optimizations applied**
- [x] **Dockerfile fixed** (no .env.production errors)
- [x] **Worker pools optimized** (1 worker each)
- [x] **SSL configuration ready** (DB_SSL=false)
- [x] **Database schema prepared**

---

## 📋 Step-by-Step Deployment

### 1. Create PostgreSQL Database First

**In Coolify Dashboard:**
1. Go to your project
2. Click **"+ Add Resource"**
3. Select **"PostgreSQL"**
4. Configure:
   ```
   Name: attendance-db
   Database: attendance_dashboard
   Username: attendance_user
   Password: nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
   ```
5. **IMPORTANT: Add these environment variables to PostgreSQL service:**
   ```
   POSTGRES_INITDB_ARGS=--auth-host=md5
   POSTGRES_HOST_AUTH_METHOD=md5
   ```
6. **Deploy PostgreSQL** and wait for it to be healthy

### 2. Create Application

**In Coolify Dashboard:**
1. Click **"+ Add Resource"**
2. Select **"Application"**
3. Choose **"GitHub Repository"**
4. Select: `Fullship/attendance-dashboard`
5. Branch: `main`
6. Build Pack: **Dockerfile**

### 3. Configure Application Environment Variables

**Copy and paste these EXACT variables:**

```env
# Database Configuration - MUST match PostgreSQL service name
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
DB_SSL=false

# JWT Security - Use this exact secret
JWT_SECRET=712154c1e504f6cb30c1510fe6f1b20b826da31c86c81bbb338650b82b961580a4f69c3bf19ea3ec96dcc6fc8316daf585c6dad3054d88be3e528bf5ec547c72

# Redis (disabled)
REDIS_ENABLED=false
REDIS_HOST=disabled

# Application
NODE_ENV=production
PORT=3002
```

### 4. Deploy Application

1. **Save environment variables**
2. **Click Deploy**
3. **Monitor build logs** - should complete without errors
4. **Wait for healthy status**

---

## 🔍 Post-Deployment Verification

### Step 1: Check Application Health
- [ ] **Application shows "Healthy" status**
- [ ] **No build errors in deployment logs**
- [ ] **PostgreSQL shows "Healthy" status**

### Step 2: Test Frontend Access
- [ ] **Visit https://my.fullship.net**
- [ ] **Page loads without CORS errors**
- [ ] **Login form is visible**

### Step 3: Initialize Database Schema

**Access PostgreSQL and run initialization:**

**Option A: Coolify Terminal (Recommended)**
1. Go to PostgreSQL service in Coolify
2. Open terminal/console
3. Connect: `psql -U attendance_user -d attendance_dashboard`
4. Copy and paste content from `database-init.sql`

**Option B: External Tool**
1. Get PostgreSQL connection details from Coolify
2. Connect with pgAdmin/DBeaver
3. Run `database-init.sql` script

### Step 4: Test Login
- [ ] **Try login with:**
  - Email: `admin@company.com`
  - Password: `admin123`
- [ ] **Should redirect to dashboard (not 500 error)**
- [ ] **Admin features accessible**

---

## 🚨 Troubleshooting Common Issues

### Database Connection Failed
**Symptoms:** 500 error on login, "Database connection failed" in logs

**Solutions:**
1. **Check DB_HOST exactly matches PostgreSQL service name**
2. **Verify both services are in same project**
3. **Ensure PostgreSQL is healthy before app deployment**
4. **Check environment variables are saved on APPLICATION**

### PostgreSQL Won't Start
**Symptoms:** PostgreSQL shows unhealthy, startup errors

**Solutions:**
1. **Add required environment variables to PostgreSQL service:**
   ```
   POSTGRES_INITDB_ARGS=--auth-host=md5
   POSTGRES_HOST_AUTH_METHOD=md5
   ```
2. **Restart PostgreSQL service**
3. **Check PostgreSQL logs for specific errors**

### Application Build Fails
**Symptoms:** Build process stops, Docker errors

**Solutions:**
1. **Our Dockerfile is already fixed - this shouldn't happen**
2. **Check if GitHub repository is accessible**
3. **Verify Coolify has proper GitHub permissions**

### Admin Login Not Working
**Symptoms:** Login accepts credentials but shows 500

**Solutions:**
1. **Database schema not initialized** - run `database-init.sql`
2. **Wrong password hash** - use our exact admin user creation script
3. **Missing users table** - database initialization incomplete

---

## 🎉 Success Indicators

### ✅ Everything Working:
- Frontend loads at https://my.fullship.net
- Login with admin@company.com / admin123 works
- Dashboard shows admin interface
- User management accessible
- No console errors
- Database queries working

### 📊 Performance Indicators:
- Application memory usage under 512MB
- Database connections stable
- Response times under 2 seconds
- No memory leaks or crashes

---

**This deployment should work perfectly with all our lessons learned applied!** 🚀

Let me know when you've completed each step and if you encounter any issues.
