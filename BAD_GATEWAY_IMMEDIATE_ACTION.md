# 🚨 Bad Gateway Error - Immediate Actions

## What to do RIGHT NOW:

### If this is happening on Coolify:

1. **Check Coolify Application Logs:**
   - Go to your Coolify dashboard
   - Navigate to your attendance-dashboard application
   - Click on "Logs" or "Show Logs"
   - Look for error messages

2. **Check Application Status:**
   - In Coolify dashboard, verify the application status
   - Look for "Failed", "Stopped", or "Building" status
   - Check if deployment completed successfully

3. **Quick Coolify Restart:**
   - In Coolify dashboard, click "Restart" or "Redeploy"
   - This will restart your application containers

### If this is happening on your own server:

Run these commands on your server:

```bash
# 1. Quick diagnostic
./diagnose-bad-gateway.sh

# 2. Quick fix attempt
./fix-bad-gateway.sh

# 3. Manual check
docker ps
docker logs [container-name] --tail 20
```

## Most Common Causes:

### 1. Backend Container Crashed
**Symptoms:** 502 Bad Gateway on all API requests
**Fix:** Restart the backend service

### 2. Database Connection Failed
**Symptoms:** Backend starts but crashes when handling requests
**Fix:** Check database connection string and credentials

### 3. Redis Connection Timeout
**Symptoms:** Backend fails to start or crashes during session handling
**Fix:** Verify Redis connection settings

### 4. Port Conflicts
**Symptoms:** Service fails to bind to port
**Fix:** Check if port 3002 is already in use

### 5. Environment Variables Missing
**Symptoms:** Backend crashes on startup
**Fix:** Verify all required environment variables are set

## Emergency Commands:

### Coolify Environment:
```bash
# Check Coolify application status
# (Run in Coolify dashboard)
```

### Self-hosted Environment:
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Test backend directly
curl http://localhost:3002/health
```

## What to Share for Help:

If you need assistance, provide:
1. **Platform:** Coolify or self-hosted?
2. **Error logs:** From application containers
3. **Service status:** Output of `docker ps` or Coolify status
4. **Recent changes:** Any recent deployments or configuration changes?

---

**Priority:** High - Service Down
**Next Step:** Run diagnostics and apply appropriate fix 🚑
