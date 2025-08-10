# 🔧 Redis Connection Fix for Coolify

## 🚨 The Problem:
Your application is trying to connect to `your-redis-host` which is a placeholder hostname that doesn't exist.

## 🛠️ Step-by-Step Fix in Coolify:

### 1. Go to Coolify Dashboard
- Navigate to your attendance-dashboard application
- Click on "Environment Variables" or "Configuration"

### 2. Find Redis Variables
Look for these environment variables:
```
REDIS_HOST=your-redis-host  ← This is the problem!
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 3. Choose Your Fix:

#### Option A: You have Redis service in Coolify
```bash
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=[your-actual-password]
```

#### Option B: External Redis service
```bash
REDIS_HOST=[your-actual-redis-hostname]
REDIS_PORT=6379
REDIS_PASSWORD=[your-actual-password]
```

#### Option C: Disable Redis (if not needed)
```bash
REDIS_ENABLED=false
REDIS_HOST=localhost
SESSION_STORE=memory
```

### 4. Save and Restart
- Click "Save" or "Update"
- Click "Restart" or "Redeploy" the application

## 🧪 Test After Fix:
```bash
# Should work now
curl https://my.fullship.net/api/auth/check

# Should serve frontend
curl https://my.fullship.net/
```

## 📋 Common Redis Hostnames in Coolify:
- `redis` (if Redis service is named "redis")
- `redis-cache` 
- `redis-session`
- `[your-project-name]-redis`

## 🔍 How to Find Your Redis Service:
1. In Coolify dashboard, go to "Services" or "Resources"
2. Look for a Redis service
3. Copy the service name
4. Use that as your REDIS_HOST

---

**After fixing this, your API routes should work again!** ✅
