# MANUAL TEST PLAN
# Comprehensive testing guide for attendance-dashboard deployment

## 🧪 PRE-DEPLOYMENT TESTING

### Local Docker Test:
```bash
# Build the optimized image
docker build -f Dockerfile.optimized -t attendance-dashboard:test .

# Run with test environment
docker run -p 3002:3002 \
  -e NODE_ENV=production \
  -e REACT_APP_API_URL=http://localhost:3002/api \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6379 \
  attendance-dashboard:test

# Test endpoints
curl http://localhost:3002/health
curl http://localhost:3002/api/health
curl http://localhost:3002/
```

### Docker Compose Test:
```bash
# Start full stack
docker-compose -f docker-compose.local.yml up -d

# Verify services
docker-compose -f docker-compose.local.yml ps
docker-compose -f docker-compose.local.yml logs app

# Test application
curl http://localhost:3002/health
```

## 🌐 POST-DEPLOYMENT TESTING

### 1. Frontend Testing
**Objective**: Verify React app loads and functions

**Tests**:
- [ ] **Homepage Load**: `http://my.fullship.net/`
  - Expected: React app loads with login page or dashboard
  - Check browser console for errors
  - Verify no 404 or 500 errors

- [ ] **Static Assets**: Check browser network tab
  - CSS files load correctly
  - JS bundles load correctly
  - Images/icons load correctly
  - No CORS errors

- [ ] **React Router**: Test navigation
  - Try different routes: `/dashboard`, `/admin`, `/login`
  - Should serve React app, not 404 errors
  - React Router should handle client-side routing

### 2. API Testing
**Objective**: Verify backend APIs respond correctly

**Tests**:
- [ ] **Health Check**: `http://my.fullship.net/health`
  ```bash
  curl -i http://my.fullship.net/health
  ```
  - Expected: HTTP 200 with JSON health status
  - Should include database and Redis status

- [ ] **Auth API**: `http://my.fullship.net/api/auth/login`
  ```bash
  curl -X POST http://my.fullship.net/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@company.com","password":"admin123"}'
  ```
  - Expected: HTTP 200 with JWT token or HTTP 400 with validation error
  - Should not return 500 server error

- [ ] **General API**: `http://my.fullship.net/api/users`
  ```bash
  curl -i http://my.fullship.net/api/users
  ```
  - Expected: HTTP 401 (unauthorized) or HTTP 200 with data
  - Should not return 404 or 500

### 3. Admin API Testing
**Objective**: Verify admin endpoints are accessible

**Tests**:
- [ ] **Admin Health**: `http://my.fullship.net/api/admin/health` (if exists)
- [ ] **Admin Dashboard**: `http://my.fullship.net/api/admin/stats`
- [ ] **Admin Users**: `http://my.fullship.net/api/admin/users`

Expected responses:
- HTTP 401 for unauthorized access
- HTTP 200 for valid admin requests
- No 404 or 500 errors

### 4. Database Connectivity
**Objective**: Verify application connects to PostgreSQL

**Tests**:
- [ ] **Database Connection**: Check health endpoint includes DB status
- [ ] **User Authentication**: Attempt login with valid credentials
- [ ] **Data Operations**: Create/read/update operations work

**Verification Methods**:
```bash
# Check health endpoint for database status
curl http://my.fullship.net/health | jq '.services.database'

# Test login (requires database)
curl -X POST http://my.fullship.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

### 5. Redis Connectivity  
**Objective**: Verify Redis cache is working

**Tests**:
- [ ] **Redis Connection**: Check health endpoint includes Redis status
- [ ] **Cache Operations**: Verify caching works for API responses

**Verification**:
```bash
# Check Redis status
curl http://my.fullship.net/health | jq '.services.redis'

# Test cached endpoint (if available)
curl http://my.fullship.net/api/dashboard/stats
```

### 6. Performance Testing
**Objective**: Verify application performs adequately

**Tests**:
- [ ] **Response Times**: 
  - Frontend: < 2 seconds initial load
  - API: < 500ms response time
  - Health check: < 100ms

- [ ] **Memory Usage**: Monitor container memory
- [ ] **Concurrent Users**: Test with multiple simultaneous requests

**Tools**:
```bash
# Response time test
time curl http://my.fullship.net/health

# Load test (if Apache Bench is available)
ab -n 100 -c 10 http://my.fullship.net/api/health

# Multiple requests
for i in {1..10}; do curl http://my.fullship.net/health & done; wait
```

### 7. Error Handling
**Objective**: Verify proper error responses

**Tests**:
- [ ] **404 Errors**: Non-existent API endpoints
  ```bash
  curl http://my.fullship.net/api/nonexistent
  ```
  - Expected: HTTP 404 with proper JSON error

- [ ] **500 Errors**: Should be minimal in production
- [ ] **CORS Errors**: Cross-origin requests work properly
- [ ] **Invalid JSON**: Malformed request handling

### 8. Security Testing
**Objective**: Verify security measures are in place

**Tests**:
- [ ] **HTTPS Redirect**: Not applicable (SSL disabled by request)
- [ ] **Auth Protection**: Protected routes require authentication
- [ ] **SQL Injection**: Basic protection against malicious inputs
- [ ] **XSS Protection**: Proper input sanitization

## 📋 TEST CHECKLIST

### Pre-Deployment ✅
- [ ] Local Docker build succeeds
- [ ] Docker Compose stack runs correctly
- [ ] All environment variables configured
- [ ] Database schema initialized
- [ ] Redis accessible

### Post-Deployment ✅
- [ ] Frontend loads at `http://my.fullship.net/`
- [ ] Health check responds: `http://my.fullship.net/health`
- [ ] API endpoints accessible: `http://my.fullship.net/api/*`
- [ ] Admin endpoints accessible: `http://my.fullship.net/api/admin/*`
- [ ] Database connectivity confirmed
- [ ] Redis connectivity confirmed
- [ ] Authentication flow works
- [ ] Error handling appropriate
- [ ] Performance acceptable

### Monitoring Setup ✅
- [ ] Application logs accessible in Coolify
- [ ] Database logs accessible
- [ ] Redis logs accessible  
- [ ] Health monitoring configured
- [ ] Alert thresholds set (if applicable)

## 🚨 TROUBLESHOOTING GUIDE

### Common Issues:

**Frontend 404 Errors**:
- Check static file serving is enabled (`SERVE_STATIC=true`)
- Verify frontend build exists in container
- Check React Router wildcard route

**API 500 Errors**:
- Check database connection (DB_HOST, credentials)
- Verify Redis connection (REDIS_HOST)
- Review application logs for specific errors

**Database Connection Failed**:
- Verify PostgreSQL service is running
- Check database credentials match
- Confirm network connectivity between services

**Redis Connection Failed**:
- Verify Redis service is running
- Check Redis host configuration
- Test Redis connectivity independently

**Build Failures**:
- Check Dockerfile syntax
- Verify all COPY paths exist
- Review build logs for missing dependencies
- Ensure sufficient build resources

## 📊 SUCCESS CRITERIA

### Functional Requirements:
✅ Frontend serves React application  
✅ API endpoints respond correctly  
✅ Admin functionality accessible  
✅ Database operations work  
✅ Authentication system functional  

### Performance Requirements:
✅ Page load time < 3 seconds  
✅ API response time < 1 second  
✅ Health check < 500ms  
✅ Memory usage < 512MB  

### Reliability Requirements:  
✅ Application starts successfully  
✅ Services remain healthy  
✅ Proper error handling  
✅ Graceful degradation when possible
