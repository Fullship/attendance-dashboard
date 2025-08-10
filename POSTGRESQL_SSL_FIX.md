# 🔧 PostgreSQL SSL Permission Fix for Coolify

## 🚨 Problem
```
FATAL: could not load private key file "/var/lib/postgresql/certs/server.key": Permission denied
```

## 🎯 Quick Solution

### Option 1: Disable SSL (Recommended for internal networks)
**Already configured in your environment variables:**
```env
DB_SSL=false
```

### Option 2: Fix PostgreSQL Service Configuration in Coolify

1. **Go to your PostgreSQL service in Coolify**
2. **Add these environment variables to PostgreSQL service:**
```env
POSTGRES_INITDB_ARGS=--auth-host=md5
POSTGRES_HOST_AUTH_METHOD=md5
```

3. **Or add custom PostgreSQL configuration:**
```env
POSTGRES_CONFIG_ssl=off
```

### Option 3: Use PostgreSQL without SSL certificates

1. **In Coolify PostgreSQL service settings**
2. **Add environment variable:**
```env
POSTGRES_INITDB_ARGS=--auth-host=trust --auth-local=trust
```

## 🔄 Steps to Apply Fix

1. **Update your application environment variables** (already done):
   - Add `DB_SSL=false` ✅

2. **Update PostgreSQL service in Coolify:**
   - Go to PostgreSQL service settings
   - Add environment variable: `POSTGRES_INITDB_ARGS=--auth-host=md5`
   - **Restart the PostgreSQL service**

3. **Redeploy your application:**
   - The app will now connect without SSL
   - Database connection should work

## 🧪 Test the Fix

After applying changes:

1. **Check PostgreSQL logs** - should start without SSL errors
2. **Check application logs** - should connect to database successfully
3. **Test login** at https://my.fullship.net with:
   - Email: `admin@company.com`
   - Password: `admin123`

## 🔍 Alternative: Manual PostgreSQL Restart

If the service won't restart cleanly:

1. **Delete the PostgreSQL service**
2. **Create a new PostgreSQL service** with these settings:
```
Service Name: attendance-db
Database Name: attendance_dashboard
Username: attendance_user
Password: nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

Environment Variables:
POSTGRES_INITDB_ARGS=--auth-host=md5
```

3. **Run database initialization** after service is running:
```bash
./init-database.sh
```

## ✅ Success Indicators
- PostgreSQL service starts without errors
- Application connects to database
- Login works at https://my.fullship.net
- No more 500 errors in browser console

---
*SSL is not needed for internal Docker networking in Coolify*
