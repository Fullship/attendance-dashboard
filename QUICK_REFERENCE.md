# 🚀 Quick Reference - Coolify Deployment

## Essential Configuration

### PostgreSQL Service Configuration
```
Service Name: attendance-db
Database: attendance_dashboard  
Username: attendance_user
Password: nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

Environment Variables for PostgreSQL Service:
POSTGRES_INITDB_ARGS=--auth-host=md5
POSTGRES_HOST_AUTH_METHOD=md5
```

### Application Environment Variables
```env
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
DB_SSL=false
JWT_SECRET=712154c1e504f6cb30c1510fe6f1b20b826da31c86c81bbb338650b82b961580a4f69c3bf19ea3ec96dcc6fc8316daf585c6dad3054d88be3e528bf5ec547c72
REACT_APP_API_URL=https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api
REDIS_ENABLED=false
REDIS_HOST=disabled
NODE_ENV=production
PORT=3002
```

### Default Login Credentials
```
Email: admin@company.com
Password: admin123
```

## Deployment Order
1. ✅ Create PostgreSQL database first
2. ✅ Add PostgreSQL environment variables  
3. ✅ Deploy PostgreSQL and wait for healthy
4. ✅ Create application from GitHub
5. ✅ Add application environment variables
6. ✅ Deploy application
7. ✅ Initialize database schema
8. ✅ Test login

## Repository Information
- **Repository:** `Fullship/attendance-dashboard`
- **Branch:** `main`
- **Build Pack:** Dockerfile
- **Frontend URL:** https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io
- **API URL:** https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api

---
*All optimizations applied: Fixed Dockerfile, Reduced worker pools, SSL bypass, Memory optimization* ✨
