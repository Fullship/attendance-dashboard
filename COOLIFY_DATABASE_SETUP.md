# Database Setup Guide for Coolify

## 1. Add PostgreSQL Service to Your Coolify Project

### Step 1: Add Database Service
1. Go to your Coolify dashboard
2. Navigate to your attendance-dashboard project
3. Click "Add Service" or "Add Database"
4. Select "PostgreSQL"
5. Configure the database:
   - Name: `attendance-db` (or similar)
   - Version: Latest stable (e.g., PostgreSQL 15)
   - Username: `postgres` (default)
   - Password: Generate a secure password
   - Database Name: `attendance_dashboard`

### Step 2: Get Connection Details
After creating the database, Coolify will provide:
- Internal hostname (usually: `attendance-db` or similar)
- Port: `5432` (default)
- Username: `postgres`
- Password: (the one you set)
- Database name: `attendance_dashboard`

### Step 3: Update Environment Variables in Coolify
Go to your application's Environment Variables section and add:

```bash
# Database Configuration
DB_HOST=attendance-db  # (use the internal hostname from Coolify)
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=postgres
DB_PASSWORD=your_generated_password  # (from Coolify)

# JWT Secret (required for authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024

# Session Secret
SESSION_SECRET=your-session-secret-key-change-in-production

# Frontend URL for CORS
FRONTEND_URL=https://my.fullship.net

# Redis (optional - can be disabled)
REDIS_HOST=redis-not-available
REDIS_PORT=6379
```

### Step 4: Initialize Database Schema
After the database is connected, you'll need to create the tables.

## 2. Alternative: Use External Database

If you prefer to use an external PostgreSQL database:
- Set up PostgreSQL on a cloud provider (AWS RDS, DigitalOcean, etc.)
- Use those connection details in the environment variables

## Next Steps

1. Set up the database service in Coolify
2. Update the environment variables
3. Deploy the application
4. Initialize the database schema (I can help with this)

Let me know which option you'd like to pursue!
