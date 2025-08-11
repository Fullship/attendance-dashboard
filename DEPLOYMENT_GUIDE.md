# COOLIFY DEPLOYMENT GUIDE
# Step-by-step configuration for my.fullship.net deployment

## 🚀 COOLIFY RESOURCE SETTINGS

### Application Configuration:
- **Name**: attendance-dashboard
- **Domain**: my.fullship.net
- **Build Method**: Dockerfile
- **Dockerfile Path**: `Dockerfile.optimized` (or rename to `Dockerfile`)
- **Build Context**: `/` (root of repository)
- **Port**: 3002
- **SSL/TLS**: ❌ DISABLED (as requested)

### Environment Variables (Set in Coolify):
```env
# Application
NODE_ENV=production
PORT=3002
SERVE_STATIC=true
ENABLE_CLUSTERING=false

# Frontend API URL
REACT_APP_API_URL=http://my.fullship.net/api

# Database (PostgreSQL service in Coolify)
DB_HOST=<your-postgres-service-name>
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

# Redis (Redis service in Coolify)
REDIS_HOST=<your-redis-service-name>
REDIS_PORT=6379

# Security (Generate strong secrets)
JWT_SECRET=<generate-strong-jwt-secret>
SESSION_SECRET=<generate-strong-session-secret>
```

### Services Required:
1. **PostgreSQL Database**
   - Image: `postgres:15-alpine`
   - Environment:
     - POSTGRES_DB=attendance_dashboard
     - POSTGRES_USER=attendance_user
     - POSTGRES_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
   - Persistent Volume: Required for `/var/lib/postgresql/data`

2. **Redis Cache**
   - Image: `redis:7-alpine`
   - Persistent Volume: Optional for `/data`

3. **Main Application**
   - Build from Dockerfile.optimized
   - Domain: my.fullship.net

## 🛠️ DEPLOYMENT STEPS

### Step 1: Create PostgreSQL Service
1. New Resource → Database → PostgreSQL
2. Set database credentials as above
3. Note the service name for DB_HOST environment variable

### Step 2: Create Redis Service  
1. New Resource → Database → Redis
2. Default configuration is sufficient
3. Note the service name for REDIS_HOST environment variable

### Step 3: Create Main Application
1. New Resource → Application
2. Connect to GitHub repository: Fullship/attendance-dashboard
3. Set build configuration:
   - Build Method: Dockerfile
   - Dockerfile: Dockerfile.optimized
   - Build Context: /
4. Set domain: my.fullship.net
5. Disable SSL/TLS
6. Configure environment variables as listed above
7. Set port: 3002

### Step 4: Network Configuration
- Ensure all services are in the same Coolify project
- Services will communicate via internal Docker network
- Use service names as hostnames (DB_HOST, REDIS_HOST)

## 🧪 HEALTH CHECKS

### Application Health Check:
- **Endpoint**: `http://my.fullship.net/health`
- **Expected Response**: JSON with status "healthy"

### API Health Check:
- **Endpoint**: `http://my.fullship.net/api/auth/health` (if exists)
- **Admin API**: `http://my.fullship.net/api/admin/health` (if exists)

## 🔧 TROUBLESHOOTING

### Build Issues:
- Check Dockerfile path is correct
- Verify all COPY paths exist in repository
- Review build logs for missing dependencies

### Runtime Issues:
- Check environment variables are set correctly
- Verify database connection (DB_HOST, credentials)
- Verify Redis connection (REDIS_HOST)
- Check application logs for detailed errors

### Network Issues:
- Ensure services can communicate internally
- Check that service names match environment variables
- Verify ports are exposed correctly

## 📊 MONITORING

### Logs to Monitor:
- Application startup logs
- Database connection logs  
- Redis connection logs
- HTTP request logs

### Performance Metrics:
- Memory usage
- CPU usage
- Response times
- Database query performance

## 🔐 SECURITY CONSIDERATIONS

### Production Secrets:
- Generate strong JWT_SECRET (32+ characters)
- Generate strong SESSION_SECRET (32+ characters)  
- Use environment variables, never hardcode secrets
- Consider using Coolify's secret management

### Database Security:
- Restrict database access to application only
- Use strong passwords
- Regular backups
- Monitor for unusual activity
