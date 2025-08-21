# Attendance Dashboard - Coolify Deployment

## Quick Deployment Guide

### Environment Variables for Coolify

Set these environment variables in your Coolify application:

```bash
# Application
NODE_ENV=production
PORT=3002

# Database
DB_HOST=your-postgres-service-name
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=your-database-password
DB_SSL=false

# Redis
REDIS_HOST=your-redis-service-name
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Security
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret

# Frontend
FRONTEND_URL=http://my.fullship.net
REACT_APP_API_URL=http://my.fullship.net/api
```

### Database Setup

1. Create PostgreSQL service in Coolify
2. Create the database and user:

```sql
CREATE DATABASE attendance_dashboard;
CREATE USER attendance_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE attendance_dashboard TO attendance_user;
```

3. Run the database initialization script: `init-database.sql`

### Deployment

1. **Dockerfile**: Use the main `Dockerfile` in the root directory
2. **Domain**: Configure `my.fullship.net` as your application domain
3. **Build**: Standard build process, no special arguments needed

### Health Check

- Health endpoint: `http://my.fullship.net/health`
- Frontend: `http://my.fullship.net/`
- API: `http://my.fullship.net/api/`

### Local Testing

Run `./test-deployment.sh` to test locally before deploying to Coolify.
