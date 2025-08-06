# Coolify Deployment Guide for Attendance Dashboard

This guide will help you deploy the Attendance Dashboard on Coolify, excluding PostgreSQL and Redis which should be set up separately.

## Prerequisites

1. **Coolify Server**: Running Coolify instance
2. **External Database**: PostgreSQL database already created in Coolify
3. **External Redis**: Redis instance already created in Coolify
4. **Domain Names**: Domains configured for frontend and backend (optional but recommended)

## Step-by-Step Deployment

### 1. Database Setup (If not already done)

Create PostgreSQL and Redis resources in Coolify:

#### PostgreSQL Database
- Name: `attendance-postgres`
- Database: `attendance_db`
- Username: `admin` (or your preferred username)
- Password: Generate a secure password

#### Redis Cache
- Name: `attendance-redis`
- Password: Generate a secure password (optional but recommended)

### 2. Backend Deployment

1. **Create New Resource in Coolify**
   - Choose "Docker Compose"
   - Repository: Your Git repository URL
   - Branch: `main` (or your deployment branch)

2. **Docker Compose Configuration**
   ```yaml
   # Use the provided docker-compose.coolify.yml
   # Or create a new service with these settings
   ```

3. **Environment Variables**
   Set these environment variables in Coolify for the backend service:

   ```bash
   # Application
   PORT=3002
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.com

   # Database (from your Coolify PostgreSQL)
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=attendance_db
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password

   # Redis (from your Coolify Redis)
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password

   # Security
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

   # Performance
   ENABLE_CLUSTERING=true
   MAX_WORKERS=4

   # Optional: Email configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Build Settings**
   - Build Command: Uses Dockerfile in `/backend` directory
   - Port: `3002`
   - Health Check: `/health`

### 3. Frontend Deployment

1. **Create New Resource in Coolify**
   - Choose "Docker Compose" or "Static Site"
   - Same repository as backend

2. **Environment Variables**
   ```bash
   # API Configuration
   REACT_APP_API_URL=https://your-backend-domain.com
   
   # Build configuration
   REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
   REACT_APP_BUILD_HASH=$(date +%s)-$(openssl rand -hex 4)
   ```

3. **Build Settings**
   - Build Command: Uses Dockerfile in `/frontend` directory
   - Port: `80`
   - Health Check: `/health`

### 4. Domain Configuration

1. **Backend Domain**
   - Set up domain: `api.yourdomain.com`
   - Enable HTTPS
   - Configure CORS in environment variables

2. **Frontend Domain**
   - Set up domain: `app.yourdomain.com` or `yourdomain.com`
   - Enable HTTPS
   - Update backend `FRONTEND_URL` environment variable

### 5. Database Initialization

After deployment, you may need to initialize your database:

1. **Connect to your PostgreSQL instance**
2. **Run initialization scripts** (if you have any in `/database/init.sql`)
3. **Verify connection** from backend service

### 6. Monitoring and Health Checks

The deployment includes:
- **Backend Health Check**: `GET /health`
- **Frontend Health Check**: `GET /health`
- **Database Connection Monitoring**
- **Redis Connection Monitoring**

### 7. SSL/TLS Configuration

Coolify automatically handles SSL certificates when domains are configured:
- Enable automatic SSL certificates
- Configure redirect from HTTP to HTTPS

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - Check if PostgreSQL service is running
   - Verify network connectivity between services

2. **Redis Connection Issues**
   - Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - Check if Redis service is running

3. **CORS Issues**
   - Verify `FRONTEND_URL` in backend environment
   - Check domain configuration

4. **Build Failures**
   - Check Docker build logs
   - Verify all dependencies are properly installed
   - Check `.dockerignore` files

### Logs and Debugging

- Access logs through Coolify dashboard
- Use `docker logs <container_name>` for detailed debugging
- Monitor health check endpoints

## Security Considerations

1. **Environment Variables**
   - Use strong, unique passwords
   - Rotate JWT secrets regularly
   - Use secure email app passwords

2. **Network Security**
   - Keep services in private networks
   - Use HTTPS for all external communications

3. **Database Security**
   - Regular backups
   - Access controls
   - Connection encryption

## Scaling

The deployment is configured for horizontal scaling:
- Backend uses clustering (configurable via `MAX_WORKERS`)
- Frontend serves static files through nginx
- Database and Redis are external services

## Backup Strategy

1. **Database Backups**: Configure automatic backups in Coolify
2. **Redis Backups**: Configure persistence and backups
3. **Application Code**: Ensure code is in version control

## Updates and Deployment

1. **Zero-Downtime Deployment**: Coolify supports rolling updates
2. **Environment Variables**: Can be updated without rebuilding
3. **Database Migrations**: Handle carefully with proper backup strategy

## Support

If you encounter issues:
1. Check Coolify documentation
2. Review application logs
3. Verify environment configuration
4. Test database and Redis connectivity
