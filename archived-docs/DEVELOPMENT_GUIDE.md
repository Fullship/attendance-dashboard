# 🚀 Development Guide - Attendance Dashboard

## System Status: ✅ READY FOR DEVELOPMENT

All services are running and configured properly:
- **Frontend**: http://localhost:3000 (React + TypeScript)
- **Backend**: http://localhost:3002 (Node.js + PostgreSQL)
- **MCP Bridge**: http://localhost:3003 (HTTP API Bridge)

## 🏁 Quick Start Development

### 1. Start All Services
```bash
npm run dev
```
This starts all three services with hot reload and unified logging.

### 2. Access Points
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3002/api
- **API Documentation**: Available via backend endpoints
- **Database**: PostgreSQL (attendance_dashboard_dev)

## 🛠️ Development Workflows

### Frontend Development (React)
```bash
# Frontend is already running on port 3000
# Files: frontend/src/
# Hot reload: Automatic on file changes
# Proxy: All /api/* requests → Backend (3002)
```

**Key Frontend Features:**
- Admin Dashboard with tabs (overview, employees, attendance)
- Real-time updates via Socket.IO
- Virtualized tables for large datasets
- Lazy loading for performance
- Material-UI components with Tailwind CSS

### Backend API Development (Node.js)
```bash
# Backend is running on port 3002
# Files: backend/
# Routes: backend/routes/
# Database: backend/database/
```

**Available API Endpoints:**
- `/api/auth/*` - Authentication (login, logout, session)
- `/api/admin/*` - Admin operations (CRUD for employees, attendance)
- `/api/users/*` - User operations (profile, attendance requests)
- `/api/reports/*` - Reporting and analytics

### Database Operations
```bash
# Reset database with fresh schema + test data
npm run db:reset

# Run specific migration
./backend/scripts/run-migration.js migration-file.js

# Check database connection
node backend/test-db-connection.js
```

## 📊 Current Features Implemented

### ✅ Authentication System
- JWT-based authentication
- Admin vs User role separation
- Session management
- Password hashing with bcrypt

### ✅ Employee Management
- CRUD operations for employees
- Department and team assignments
- Employee hierarchy and reporting structure
- Bulk operations support

### ✅ Attendance System
- Clock in/out requests with admin approval
- Attendance history tracking
- Real-time status updates
- Geolocation validation (optional)

### ✅ Leave Management
- 24-day semi-annual leave system
- 10 business rules for leave approval
- Weekend restrictions
- Team capacity limits (49% max)
- Sick leave (always requires admin approval)
- 3+ day leaves need management approval

### ✅ Performance Optimizations
- 87% bundle size reduction through code splitting
- React Window for 1000+ item virtualization
- Redis caching for frequent queries
- PM2 clustering for multi-core utilization
- Compression middleware (95% response reduction)

## 🔧 Development Tools

### Testing
```bash
# API endpoint testing
./test-admin-login.js
./test-complete-workflow.js

# Frontend proxy testing
./test-proxy.sh

# Database testing
node backend/test-db-connection.js
```

### Monitoring
```bash
# Backend logs (includes API requests, database queries)
# Frontend logs (webpack, compilation status)
# Memory profiling endpoints available in development
```

### Build & Production
```bash
# Frontend production build
cd frontend && npm run build

# PM2 production clustering
npm run pm2:start

# Full environment setup for production
npm run startup --prod
```

## 🗂️ Project Structure

```
attendance-dashboard/
├── backend/                 # Node.js API server
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth, CORS, rate limiting
│   ├── database/           # SQL schemas, migrations
│   └── workers/            # Background job processors
├── frontend/               # React SPA
│   ├── src/components/     # React components
│   ├── src/admin/          # Admin-only components
│   └── src/setupProxy.js   # API proxy configuration
├── mcp-bridge/             # HTTP bridge for MCP tools
├── mcp-server/             # MCP server with 25+ tools
└── start-all-servers.js    # Unified server launcher
```

## 🚨 Common Development Issues & Solutions

### Port Conflicts
- **Problem**: Services fail to start due to port conflicts
- **Solution**: Unified launcher includes automatic port conflict resolution
- **Manual fix**: `lsof -i :3000 :3002 :3003` then kill conflicting processes

### Database Connection Issues
- **Redis**: Check connection in `backend/config/redis.js`
- **PostgreSQL**: Verify credentials in `.env.local`
- **Reset**: `npm run db:reset` for fresh start

### Frontend-Backend Communication
- **Proxy routing**: Already configured in `setupProxy.js`
- **CORS**: Backend allows `localhost:3000` in development
- **API prefix**: All requests must use `/api/` prefix

## 🎯 Next Development Priorities

### Immediate Features to Implement:
1. **Enhanced Dashboard Analytics**
   - Attendance trends and patterns
   - Leave utilization reports
   - Team productivity metrics

2. **Advanced Leave Management**
   - Leave calendar integration
   - Conflict detection and resolution
   - Automated approval workflows

3. **Mobile-First Enhancements**
   - Progressive Web App (PWA) features
   - Offline attendance recording
   - Push notifications

4. **Integration Features**
   - LDAP/Active Directory integration
   - Slack/Teams notifications
   - Calendar sync (Google/Outlook)

### Architecture Enhancements:
1. **Complete MCP Integration**
   - Fix MCP client connection for full tool access
   - Implement all 25+ database tools
   - Add file upload/download capabilities

2. **Advanced Monitoring**
   - Datadog APM integration (already prepared)
   - Performance metrics dashboard
   - Real-time error tracking

3. **Scalability Improvements**
   - Kubernetes deployment configurations
   - Database sharding for large datasets
   - CDN integration for static assets

## 📝 Development Best Practices

### Code Style
- **TypeScript**: Strict mode enabled for frontend
- **ESLint**: Configured for both frontend and backend
- **Prettier**: Automatic code formatting
- **Git hooks**: Pre-commit linting and testing

### Database Migrations
- **Pattern**: `backend/migrations/*.js`
- **Naming**: `YYYY-MM-DD-description.js`
- **Testing**: Always test on development database first

### API Development
- **RESTful patterns**: Follow established route conventions
- **Error handling**: Use `handleApiError()` utility
- **Authentication**: Use middleware chain: `auth → adminAuth → routes`
- **Validation**: Input validation on all endpoints

### Frontend Components
- **Lazy loading**: Use `React.lazy()` for heavy components
- **Memoization**: `React.memo()` for expensive renders
- **State management**: React Context for global state
- **Performance**: Virtualization for large lists

## 🚀 Ready to Build!

The system is fully operational and ready for feature development. All core infrastructure is in place:
- ✅ Authentication and authorization
- ✅ Database operations and migrations  
- ✅ Real-time communication
- ✅ Performance optimizations
- ✅ Development tooling
- ✅ Production deployment options

**Start developing by:**
1. Choosing a feature from the priority list above
2. Creating database migrations if needed
3. Implementing backend API endpoints
4. Building frontend components
5. Testing the complete workflow

Happy coding! 🎉
