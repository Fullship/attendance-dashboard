# Copilot Instructions for Attendance Dashboard

## 🏗️ Architecture Overview

This is a **tri-service enterprise attendance management system** with distinct service boundaries:

- **Backend API** (port 3002): Node.js/Express with PostgreSQL, Redis caching, PM2 clustering
- **Frontend SPA** (port 3001): React 19 with TypeScript, Tailwind CSS, proxy-based API communication  
- **MCP Server** (port 3003): Model Context Protocol server with HTTP bridge for AI tool integration

### Critical Service Communication
- Frontend proxies ALL `/api/*` requests to backend via `setupProxy.js` - **never modify pathRewrite**
- Backend expects full `/api` prefix (mounted at `/api/auth`, `/api/admin`, etc.)
- Real-time updates via Socket.IO between frontend/backend
- MCP Bridge provides HTTP wrapper around stdio-based MCP protocol

## ⚡ Development Workflows

### Server Management (Most Important)
```bash
# ALWAYS use unified launcher - never start services individually
npm run dev              # Start all 3 servers with health checks & port conflict resolution
npm run startup          # Full environment setup (deps, builds, DB prep)
npm run pm2:start        # Production cluster mode
```

**Never run** `cd backend && npm start` or individual service commands - this breaks proxy routing and causes port conflicts.

### Database Operations
```bash
# Migration pattern (backend/migrations/*.js)
npm run db:reset         # Fresh schema + test data
./backend/scripts/run-migration.js <migration-file>
```

## 🔧 Project-Specific Patterns

### API Architecture
- **Dual Route Pattern**: Most endpoints have admin + user versions
  - `/api/admin/employees` (admin CRUD)
  - `/api/users/profile` (user read-only)
- **Middleware Chain**: `auth → adminAuth → routes` for protected endpoints
- **Error Handling**: Standardized format with `handleApiError()` utility

### Frontend Component Architecture
```typescript
// Lazy loading pattern for large components
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// Virtualized tables for 1000+ records
<VirtualizedTable columns={columns} data={data} height={400} />

// Admin dashboard tabs pattern
const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'attendance'>('overview');
```

### State Management
- **React Context** for auth, socket, theme
- **Local state** with optimistic updates + error rollback
- **Cache invalidation** via socket events (`employeeUpdated`, `attendanceChanged`)

## 📊 Performance Conventions

### Bundle Optimization (87% reduction achieved)
- **Code splitting** by route and heavy components
- **Lazy loading** for admin panels, charts, and forms
- **React.memo()** for expensive list renders
- **React Window** for 1000+ item virtualization

### API Optimization
- **Redis caching** for employee lists, metrics, and frequent queries
- **Compression middleware** reducing responses by 95%
- **PM2 clustering** for multi-core utilization
- **Query optimization** with connection pooling

## 🗃️ Database Patterns

### Leave Management (Complex Business Logic)
```sql
-- 24-day semi-annual system with 10 business rules
-- Weekend restrictions, team capacity limits (49%)
-- Sick leave always requires admin approval
-- 3+ day leaves need management approval
```

### Attendance Workflow
1. Employee submits clock request → `clock_requests` table
2. Admin approves/rejects → Updates `attendance` table
3. Socket.IO broadcasts change → Live dashboard updates

## 🔒 Security & Environment

### Environment Loading Priority
```javascript
// backend/server-worker.js pattern
1. .env.local (development override)
2. .env (production)  
3. System environment variables
```

### CORS Configuration
- Backend allows `localhost:3001` (frontend) in development
- Production uses `FRONTEND_URL` environment variable
- **Never bypass** - proxy handles cross-origin properly

## 🚨 Common Issues & Solutions

### Proxy Routing Failures
- **Symptom**: "POST http://localhost:3001/api/auth/login 404"
- **Cause**: setupProxy.js misconfigured or services not running
- **Fix**: Check unified server launcher status, verify backend listening on 3002

### Port Conflicts
- **Prevention**: `start-all-servers.js` includes port conflict detection
- **Manual fix**: `lsof -i :3001 :3002 :3003` then kill conflicting processes

### Database Connection Issues
- **Redis**: Check connection in `backend/config/redis.js`
- **PostgreSQL**: Verify credentials in `.env.local` for development

## 📁 Key Directories

- `backend/routes/` - API endpoint definitions with auth middleware
- `frontend/src/components/admin/` - Admin-only React components  
- `backend/middleware/` - Auth, CORS, rate limiting, monitoring
- `database/` - SQL schemas, migrations, sample data
- `logs/` - PM2 logs, query logs, performance metrics

## 🧪 Testing Approach

### API Testing
```bash
# Backend endpoint testing
./test-admin-login.js
./test-complete-workflow.js
./test-proxy.sh  # Validates frontend → backend proxy
```

### Frontend Testing
- Component testing with `@testing-library/react`
- E2E with Playwright in `frontend/e2e/`
- Manual testing guides in `**/TESTING_*.md` files

## 🔧 Build & Deployment

### Development
- **Hot reload**: Frontend only (React dev server)
- **API changes**: Require manual restart of unified launcher
- **DB changes**: Run migrations then restart

### Production Options

#### Coolify Deployment (Primary Method)
```bash
# Repository setup (GitHub)
Repository: Fullship/attendance-dashboard
Branch: main
Build Pack: Dockerfile
Port: 3002
Health Check: /health
```

**Critical Coolify Configuration:**
- **Domain**: Use generated `.sslip.io` domain or custom domain with DNS A record
- **Database Services**: PostgreSQL + Redis as separate services in same project
- **Service Names**: `attendance-postgres`, `attendance-redis` (must match `DB_HOST`/`REDIS_HOST`)
- **Environment**: Production settings with `REACT_APP_API_URL` matching domain

**Common Coolify Issues:**
- **"could not read Username"**: Repository is private - make public or use deploy key
- **502 Bad Gateway**: Check PORT=3002 and health endpoint accessibility
- **Database connection fails**: Verify service names match exactly, run init-database.sql
- **Custom domain "no available server"**: Use generated domain instead, update API_URL

#### Docker Deployment (Alternative)
- **Multi-stage builds** with Nginx reverse proxy
- **PM2 clustering** for production scaling
- **Monitoring**: Datadog APM integration ready (see `datadog/` directory)

#### Manual PM2 (Local Production)
```bash
npm run pm2:start        # Single server clustering
npm run startup --prod   # Full environment + PM2
```

Focus on unified server management, proxy routing integrity, and the complex leave management business logic when making changes.
