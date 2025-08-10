# 🔍 Route Not Found Error - Debugging Guide

## Error Analysis

You're getting: `{"message":"Route not found","worker":"single"}`

**✅ Good News:** Your backend is running in single worker mode  
**❌ Issue:** The requested route doesn't exist or isn't being matched

## Available API Routes

Based on your server configuration, these routes should work:

### 🔐 Authentication Routes (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check auth status

### 👤 User Routes (`/api/users`)
- `GET /api/users/profile` - Get user profile
- `GET /api/users/clock-requests` - Get clock requests

### 📊 Attendance Routes (`/api/attendance`)
- `GET /api/attendance/records` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics

### 👥 Admin Routes (`/api/admin`)
- Various admin endpoints

### 🏖️ Leave Routes (`/api/enhanced-leave`, `/api/admin-leave`)
- Leave management endpoints

### 🔧 Monitoring Routes (`/api/monitoring`)
- `GET /api/monitoring/stats` - Database stats
- `GET /api/monitoring/slow-queries` - Slow queries
- `GET /api/monitoring/health` - Database health

### ❤️ Health Check
- `GET /health` - Application health check

## Common Issues & Solutions

### 1. Missing `/api` Prefix
**Wrong:** `GET /users/profile`  
**Correct:** `GET /api/users/profile`

### 2. Incorrect HTTP Method
**Wrong:** `GET /api/auth/login`  
**Correct:** `POST /api/auth/login`

### 3. Missing Authentication
Many routes require authentication. Make sure you're sending valid session/auth headers.

### 4. Case Sensitivity
Routes are case-sensitive. Use exact spelling and casing.

## Quick Route Test Commands

Test these routes to verify your backend is working:

```bash
# Test health check (should work without auth)
curl http://my.fullship.net/health

# Test API health check  
curl http://my.fullship.net/api/monitoring/health

# Test a protected route (will fail without auth, but should give proper error)
curl http://my.fullship.net/api/users/profile

# Test non-existent route (should give "Route not found")
curl http://my.fullship.net/api/nonexistent
```

## Frontend Route Issues

If you're getting this error from the frontend, check:

### 1. API Base URL Configuration
Look for API configuration in your frontend:

```javascript
// Check if this is correct
const API_BASE_URL = 'https://my.fullship.net/api'
```

### 2. Frontend Router vs Backend API
Make sure you're not confusing:
- **Frontend routes** (React Router) - handled by frontend
- **API routes** (Express) - handled by backend

### 3. Proxy Configuration
In development, check if your proxy is correctly configured.

## Debug Steps

### Step 1: Identify the Failing Route
- What URL are you trying to access?
- What HTTP method (GET, POST, etc.)?
- Is it from browser, frontend app, or direct API call?

### Step 2: Check Route Registration
The route might not be properly registered. Check:
```bash
# Look for the route in backend files
grep -r "your-route-path" backend/routes/
```

### Step 3: Check Middleware Issues
The route might exist but be blocked by middleware:
- Authentication middleware
- Rate limiting
- CORS issues

### Step 4: Check Request Path
Common issues:
- Extra/missing slashes: `/api//users` vs `/api/users`
- Query parameters: `/api/users?id=1`
- URL encoding issues

## Quick Fix Checklist

- [ ] ✅ Backend server is running (you confirmed this)
- [ ] ❓ Route path is correct (check this)
- [ ] ❓ HTTP method is correct (GET vs POST)
- [ ] ❓ Authentication is provided if required
- [ ] ❓ Content-Type headers are correct
- [ ] ❓ No typos in the URL

## Next Steps

1. **Tell me the exact URL** you're trying to access
2. **Share the HTTP method** (GET, POST, etc.)
3. **Describe the context** (browser, frontend app, direct API call)

Then I can give you a specific solution! 🎯

---
**Status:** Backend running, route resolution needed
**Next:** Identify the specific failing route
