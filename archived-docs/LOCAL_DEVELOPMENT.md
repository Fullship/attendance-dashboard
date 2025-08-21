# Local Development Setup Guide

This guide will help you set up a local development environment for faster development and testing while keeping the production settings intact on the Coolify server.

## 🚀 Quick Start

### 1. Switch to Local Development Mode
```bash
npm run local
```

### 2. Setup Local Environment (First Time)
```bash
npm run env:setup
```

### 3. Start Development Servers
```bash
npm run dev
```

## 📋 Available Commands

### Environment Management
- `npm run local` - Switch to local development environment
- `npm run prod` - Switch to production environment  
- `npm run env:status` - Show current environment configuration
- `npm run env:setup` - Setup local development environment

### Development
- `npm run dev` - Start local development servers (backend + frontend)
- `npm run dev:backend` - Start only backend server
- `npm run dev:frontend` - Start only frontend server

### Database Management
- `npm run db:start` - Start local PostgreSQL and Redis (Docker)
- `npm run db:stop` - Stop local database services
- `npm run db:reset` - Reset local database (fresh start)

### Manual Script Usage
```bash
./dev-env.sh [command]
```

Available commands: `local`, `prod`, `status`, `setup`, `start`, `stop`, `db:start`, `db:stop`, `db:reset`, `help`

## 🗄️ Database Setup

### Local PostgreSQL
The local development uses a PostgreSQL database running in Docker:
- **Host**: localhost
- **Port**: 5432
- **Database**: attendance_dashboard_dev
- **User**: postgres
- **Password**: postgres

### Production Database
Production uses the Coolify-managed PostgreSQL service with the original settings.

## 🌐 URLs

### Local Development
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002/api
- **Admin Dashboard**: http://localhost:3000/admin

### Production
- **Live Site**: https://my.fullship.net
- **API**: https://my.fullship.net/api
- **Admin Dashboard**: https://my.fullship.net/admin

## 🔧 Configuration Files

### Environment Files
- `.env.local` - Local development backend configuration
- `frontend/.env.local` - Local development frontend configuration
- `.env.coolify` - Production configuration (Coolify)
- `.env` - Active configuration (automatically switched)

### Docker
- `docker-compose.dev.yml` - Local database services (auto-generated)

## 🔄 Switching Between Environments

### For Local Development
```bash
npm run local
npm run dev
```

### For Production Deployment
```bash
npm run prod
git add -A && git commit -m "Deploy to production" && git push
```

## 📦 First Time Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd attendance-dashboard
   npm install
   ```

2. **Setup Local Environment**
   ```bash
   npm run env:setup
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

## 🚧 Troubleshooting

### Database Connection Issues
```bash
npm run db:reset
npm run local
npm run dev
```

### Port Conflicts
- Backend uses port 3002
- Frontend uses port 3000
- PostgreSQL uses port 5432
- Redis uses port 6379

### Environment Issues
```bash
npm run env:status
```

## 🔒 Security Notes

- Local development uses the same JWT secrets as production for consistency
- Database credentials are different for security
- CORS is enabled for localhost in development mode

## 🚀 Performance Features

### Development Mode
- Query logging enabled
- Explain analyze enabled
- Hot reload enabled
- Source maps enabled

### Production Mode
- Clustering enabled
- Query logging disabled
- Optimized builds
- SSL/HTTPS enabled
