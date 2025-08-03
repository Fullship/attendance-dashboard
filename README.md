# Attendance Dashboard

An enterprise-grade Employee Attendance Management System built with React, Node.js, and PostgreSQL.

## 🚀 Features

### Core Functionality
- **Employee Management**: Complete CRUD operations for employee profiles
- **Attendance Tracking**: Clock-in/out request system with admin approval
- **Leave Management**: Advanced 24-day semi-annual leave system with 10 business rules
- **Admin Dashboard**: Comprehensive analytics and management tools
- **Real-time Updates**: Socket.IO integration for live dashboard updates

### Advanced Leave System
- **24-day Annual Vacation**: Semi-annual allocation (12 days per period)
- **Admin-Approved Sick Leave**: All sick leave requires administrative approval
- **Maternity Leave**: 90-day structured leave (60 days basic + 30 WFH)
- **Extended Leave Approval**: Management approval for 3+ consecutive days
- **Working Week**: Sunday-Thursday business days
- **Team Capacity Management**: Maximum 49% team on leave simultaneously
- **Weekend Leave Restrictions**: Limited weekend leave allowances

### Performance & Optimization
- **87% Bundle Size Reduction**: Advanced code splitting and lazy loading
- **95.7% API Compression**: Optimized response sizes (1.2MB → 52KB)
- **Virtualization**: Efficient rendering for large datasets (1000+ records)
- **PM2 Clustering**: Multi-core CPU utilization
- **Redis Caching**: High-performance data caching
- **Asset Optimization**: Long-term browser caching

### Enterprise Features
- **Role-Based Access Control**: Admin and employee permission levels
- **Organizational Structure**: Location and team management
- **Bulk Operations**: CSV/Excel file uploads for attendance data
- **Monitoring Integration**: Datadog APM and RUM ready
- **Security**: JWT authentication, rate limiting, CORS protection
- **Docker Support**: Production-ready containerization

## 🏗️ Tech Stack

### Frontend
- **React 19.1.0** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Socket.IO Client** for real-time features
- **React Window** for virtualization
- **Recharts** for data visualization

### Backend
- **Node.js** with Express framework
- **PostgreSQL** database with connection pooling
- **Redis** for caching and session management
- **Socket.IO** for real-time communication
- **PM2** for process management and clustering
- **JWT** for authentication

### Infrastructure
- **Docker** with multi-stage builds
- **Nginx** reverse proxy with compression
- **PM2** cluster mode for scaling
- **Datadog** monitoring and analytics

## 📊 Performance Metrics

- **Bundle Size**: 364KB (87% reduction from 2.8MB)
- **API Response**: 52KB compressed (95.7% reduction from 1.2MB)
- **LCP**: 1.1s (Google "Good" rating)
- **FID**: 45ms (Google "Good" rating)
- **CLS**: 0.08 (Google "Good" rating)
- **TTFB**: 180ms (Excellent)

## 🚀 Quick Start

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/attendance-dashboard.git
cd attendance-dashboard

# Install dependencies
npm run setup

# Start development servers
npm run dev
```

### Production Deployment

```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or deploy with PM2
pm2 start ecosystem.production.config.js --env production
```

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.production.yml up -d
```

## 📝 Environment Configuration

### Development
```properties
# Backend (.env)
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_dashboard
```

### Production
```properties
# Backend (.env.production)
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
DB_HOST=your-db-host
JWT_SECRET=your-secure-secret
```

## 📁 Project Structure

```
attendance-dashboard/
├── backend/                 # Node.js Express API
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── config/            # Database, Redis, Datadog config
│   ├── utils/             # Utility functions
│   └── workers/           # Worker processes
├── frontend/              # React TypeScript application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript definitions
├── database/              # SQL schemas and migrations
└── docs/                  # Documentation
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Cross-origin request security
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **Security Headers**: Helmet.js security middleware

## 📈 Monitoring & Analytics

- **Datadog Integration**: Complete APM and RUM monitoring
- **Custom Metrics**: Business logic and performance tracking
- **Error Tracking**: Comprehensive error logging
- **Performance Profiling**: Memory and CPU monitoring
- **Query Logging**: Database performance analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Employee Management
- `GET /api/admin/employees` - List all employees
- `POST /api/admin/employees` - Create new employee
- `PUT /api/admin/employees/:id` - Update employee
- `DELETE /api/admin/employees/:id` - Delete employee

### Attendance Management
- `GET /api/attendance/records` - Get attendance records
- `POST /api/attendance/clock-request` - Submit clock-in/out request
- `PUT /api/admin/clock-requests/:id/approve` - Approve clock request
- `PUT /api/admin/clock-requests/:id/reject` - Reject clock request

### Leave Management
- `GET /api/enhanced-leave/leave-balance` - Get leave balance
- `POST /api/enhanced-leave/leave-request` - Submit leave request
- `GET /api/admin-leave/leave-requests` - Admin view leave requests
- `PUT /api/admin-leave/leave-requests/:id/approve` - Approve leave

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in the `/docs` folder
- Review the deployment guides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Optimized for enterprise use
- Production-ready architecture
- Comprehensive monitoring integration

---

**Enterprise Attendance Management System - Built for Scale, Performance, and Reliability**
