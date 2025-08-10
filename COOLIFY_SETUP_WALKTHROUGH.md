# 🚀 Coolify Database Setup Walkthrough
*Step-by-step guide to fix your attendance dashboard login*

## 🎯 Current Status
- ✅ Frontend working at https://my.fullship.net
- ✅ CORS configuration fixed
- ✅ API endpoints synchronized
- ❌ **LOGIN FAILING** - Database not configured in Coolify

## 📋 Step-by-Step Setup Process

### Step 1: Access Your Coolify Dashboard
1. Go to your Coolify dashboard
2. Navigate to your attendance dashboard project
3. You should see your current application deployment

### Step 2: Add PostgreSQL Database Service
1. **In your project**, click on **"+ Add Resource"** or **"Services"**
2. **Select "PostgreSQL"** from the database options
3. **Configure the database:**
   ```
   Service Name: attendance-db
   Database Name: attendance_dashboard
   Username: attendance_user
   Password: [Generate strong password]
   Version: 15 or 16 (latest stable)
   ```
4. **Click "Deploy"** to create the PostgreSQL service

### Step 3: Get Database Connection Details
After PostgreSQL deploys, note down:
```
DB_HOST: [Internal hostname - usually service name]
DB_PORT: 5432
DB_NAME: attendance_dashboard
DB_USER: attendance_user
DB_PASSWORD: [Your generated password]
```

### Step 4: Configure Environment Variables
1. **Go to your main application** (not the database service)
2. **Find "Environment Variables" section**
3. **Add these variables:**

```env
# Database Configuration
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=your_secure_password_here

# JWT Security (generate random string)
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random

# Optional: Redis (keep disabled for now)
REDIS_ENABLED=false
```

### Step 5: Generate JWT Secret
You need a secure JWT secret. Use this command to generate one:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 6: Redeploy Application
1. **Save environment variables**
2. **Trigger a rebuild** (should happen automatically)
3. **Wait for deployment** to complete

### Step 7: Initialize Database Schema
Once your application is running with database connection:

**Option A: Use our initialization script**
1. Connect to your application container
2. Run: `./init-database.sh`

**Option B: Manual SQL execution**
1. Connect to PostgreSQL service
2. Run the SQL from `database-init.sql`

### Step 8: Test Login
Try logging in with:
- **Email:** `admin@company.com`
- **Password:** `admin123`

## 🔧 Troubleshooting

### If you still get 500 errors:
1. **Check application logs** in Coolify
2. **Verify environment variables** are set correctly
3. **Confirm database service** is running
4. **Test database connectivity** from app container

### Common Issues:
- **Wrong DB_HOST**: Use internal service name, not external hostname
- **Missing JWT_SECRET**: Application won't start without it
- **Database not ready**: Wait for PostgreSQL to fully initialize

## 🎉 Success Indicators
- ✅ No 500 errors in browser console
- ✅ Login form redirects to dashboard
- ✅ Admin user can access all features
- ✅ Database tables visible in PostgreSQL

## 📞 Need Help?
If you encounter issues:
1. Share the application logs from Coolify
2. Confirm which step you're stuck on
3. Check database service status

---
*Once this is complete, your attendance dashboard will be fully functional!*
