# 🔧 Redis Configuration for Coolify

## 📋 Current Redis Settings

### In your environment variables (coolify-env-variables.txt):
```env
# Currently DISABLED
REDIS_ENABLED=false
REDIS_HOST=disabled
```

### Default Configuration (from backend/config/redis.js):
```javascript
host: process.env.REDIS_HOST || 'localhost'
port: process.env.REDIS_PORT || 6379
password: process.env.REDIS_PASSWORD || ''
```

## 🚀 Option 1: Add Redis Service to Coolify

### Step 1: Create Redis Service in Coolify
1. **Go to your Coolify project**
2. **Click "+ Add Resource" → "Redis"**
3. **Configure Redis service:**
   ```
   Service Name: attendance-redis
   Redis Version: 7 (latest)
   Password: [Generate secure password]
   ```

### Step 2: Update Environment Variables
**Add these to your application environment variables:**

```env
# Enable Redis
REDIS_ENABLED=true
REDIS_HOST=attendance-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Keep existing database config
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
DB_SSL=false

# JWT Security
JWT_SECRET=712154c1e504f6cb30c1510fe6f1b20b826da31c86c81bbb338650b82b961580a4f69c3bf19ea3ec96dcc6fc8316daf585c6dad3054d88be3e528bf5ec547c72

# Application Settings
NODE_ENV=production
PORT=3002
```

## 🎯 Option 2: Keep Redis Disabled (Recommended for now)

**Current configuration works without Redis:**
```env
# Redis disabled - application works fine without caching
REDIS_ENABLED=false
REDIS_HOST=disabled
```

**Benefits of keeping Redis disabled:**
- ✅ Fewer services to manage
- ✅ Faster deployment
- ✅ Lower resource usage
- ✅ Simpler troubleshooting

## 🔍 Redis Connection Details

### If you enable Redis, these will be your connection details:
```
Host: attendance-redis (internal Docker network)
Port: 6379 (default Redis port)
Password: [Set in Coolify Redis service]
Database: 0 (default)
```

### Connection URL format:
```
redis://:[password]@attendance-redis:6379/0
```

## ⚡ What Redis is used for in your app:

1. **Session caching** (optional)
2. **API response caching** (performance boost)
3. **Rate limiting** (optional)
4. **Temporary data storage** (optional)

## 🎉 Recommendation

**For initial setup: Keep Redis DISABLED**
- Your attendance dashboard works perfectly without Redis
- Focus on getting PostgreSQL working first
- Add Redis later for performance optimization

**Current priority:**
1. ✅ Fix PostgreSQL SSL issue
2. ✅ Get login working
3. ⏳ Add Redis later (optional)

## 🔧 Redis Status Check

**Your app automatically detects if Redis is available:**
- If Redis connects: Uses caching for better performance
- If Redis fails: Continues without caching (graceful fallback)

---
**Redis is optional - your app works great without it!**
