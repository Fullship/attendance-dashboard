# Coolify Deployment - Quick Start

## 🚀 Ready for Coolify Deployment!

Your Attendance Dashboard is now configured for deployment on Coolify with PostgreSQL and Redis as external services.

### What's Included

- ✅ **Frontend Dockerfile** - Optimized React build with nginx
- ✅ **Backend Dockerfile** - Production-ready Node.js with clustering
- ✅ **Docker Compose** - Complete orchestration for Coolify
- ✅ **Environment Configuration** - All required variables documented
- ✅ **Health Checks** - Monitoring and reliability
- ✅ **Security** - Non-root users, proper signal handling
- ✅ **Performance** - Gzip compression, caching, clustering

### Quick Deployment Steps

1. **Prerequisites**
   ```bash
   # Ensure you have PostgreSQL and Redis running in Coolify
   # Note down their connection details
   ```

2. **Push to Git**
   ```bash
   git add .
   git commit -m "Add Coolify deployment configuration"
   git push origin main
   ```

3. **Deploy in Coolify**
   - Create new "Docker Compose" resource
   - Point to your repository
   - Use `docker-compose.coolify.yml`
   - Configure environment variables from `.env.coolify`

4. **Validate**
   ```bash
   ./validate-deployment.sh
   ```

### Environment Variables for Coolify

Copy these to your Coolify environment configuration:

```bash
# Application
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Database (your Coolify PostgreSQL)
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Redis (your Coolify Redis)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Monitoring

- **Backend Health**: `https://your-api-domain.com/health`
- **Frontend Health**: `https://your-domain.com/health`
- **Logs**: Available in Coolify dashboard

### Support

📖 **Detailed Guide**: See `COOLIFY_DEPLOYMENT_GUIDE.md`
🔧 **Validation**: Run `./validate-deployment.sh`

Happy deploying! 🎉
