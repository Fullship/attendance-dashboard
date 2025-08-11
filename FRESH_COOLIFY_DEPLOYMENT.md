# 🚀 Fresh Coolify Deployment Guide
*Clean deployment with all optimizations applied*

## 📋 Complete Step-by-Step Deployment

### Step 1: Create New Application in Coolify

1. **Go to Coolify Dashboard**
2. **Create New Project** (if needed)
3. **Add New Application**
   - **Source:** GitHub Repository
   - **Repository:** `Fullship/attendance-dashboard`
   - **Branch:** `main`
   - **Build Pack:** Dockerfile

### Step 2: Create PostgreSQL Database

1. **In your Coolify project**, click **"+ Add Resource"**
2. **Select "PostgreSQL"**
3. **Configure:**
   ```
   Service Name: attendance-db
   Database Name: attendance_dashboard
   Username: attendance_user
   Password: nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
   Version: 15 or 16 (latest)
   ```
4. **Add Environment Variables to PostgreSQL service:**
   ```
   POSTGRES_INITDB_ARGS=--auth-host=md5
   POSTGRES_HOST_AUTH_METHOD=md5
   ```
5. **Deploy PostgreSQL service**

### Step 3: Configure Application Environment Variables

**Copy these EXACT variables (updated with your domain):**

```env
# Database Configuration
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
DB_SSL=false

# JWT Security
JWT_SECRET=712154c1e504f6cb30c1510fe6f1b20b826da31c86c81bbb338650b82b961580a4f69c3bf19ea3ec96dcc6fc8316daf585c6dad3054d88be3e528bf5ec547c72

# Frontend API URL (Updated with your Coolify domain)
REACT_APP_API_URL=https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api

# Optional Redis (keep disabled)
REDIS_ENABLED=false
REDIS_HOST=disabled

# Application Settings
NODE_ENV=production
PORT=3002
```

### Step 4: Deploy Application

1. **Save environment variables**
2. **Deploy application**
3. **Wait for build to complete**

### Step 5: Initialize Database Schema

**After successful deployment, run database initialization:**

**Option A: If you have container access**
```bash
./init-database.sh
```

**Option B: Manual SQL (connect to PostgreSQL and run)**
```sql
-- Copy content from database-init.sql file
```

## ✅ Expected Results

After deployment you should have:

### **Working Login Credentials:**
- Email: `admin@company.com`
- Password: `admin123`

### **Application Features:**
- ✅ Frontend at https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io
- ✅ Admin dashboard access
- ✅ User management
- ✅ Attendance tracking
- ✅ Leave management

## 🎯 Optimizations Already Applied

Our codebase now includes:
- ✅ **Fixed Dockerfile** (no .env.production issues)
- ✅ **Optimized worker pools** (1 worker each, reduced memory)
- ✅ **SSL configuration** (DB_SSL=false)
- ✅ **Redis fallback** (works without Redis)
- ✅ **Production API URLs** (https://my.fullship.net/api)

## 🚨 Troubleshooting

If you encounter issues:

### **PostgreSQL Won't Start**
- Check PostgreSQL logs for SSL errors
- Ensure environment variables are set on PostgreSQL service
- Try recreating PostgreSQL with our recommended settings

### **Application Won't Connect to Database**
- Verify environment variables are set on APPLICATION (not just database)
- Check DB_HOST matches PostgreSQL service name exactly
- Ensure both services are in same project/network

### **Login Still Returns 500**
- Check application runtime logs
- Verify database schema is initialized
- Confirm admin users were created

## 📞 Next Steps After Deployment

1. **Verify application starts** (check logs)
2. **Test database connection** (no 500 errors)
3. **Login with admin credentials**
4. **Confirm full functionality**

---
**This fresh deployment should work perfectly with all our optimizations!** 🎉
