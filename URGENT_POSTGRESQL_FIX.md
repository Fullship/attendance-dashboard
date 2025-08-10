# 🚨 URGENT: PostgreSQL SSL Fix for Coolify

## Current Error:
```
FATAL: could not load private key file "/var/lib/postgresql/certs/server.key": Permission denied
```

## 🎯 IMMEDIATE SOLUTION

### Step 1: Fix PostgreSQL Service Configuration

**In your Coolify PostgreSQL service, add these environment variables:**

```env
# Disable SSL completely
POSTGRES_INITDB_ARGS=--auth-host=md5 --auth-local=md5
POSTGRESQL_CONF_ssl=off
POSTGRESQL_CONF_ssl_cert_file=
POSTGRESQL_CONF_ssl_key_file=
POSTGRESQL_CONF_ssl_ca_file=

# Alternative simpler approach
POSTGRES_HOST_AUTH_METHOD=md5
```

### Step 2: Or Create New PostgreSQL Service

**If the current service won't start, delete it and create new one:**

1. **Delete current PostgreSQL service** in Coolify
2. **Create new PostgreSQL service** with these settings:

```
Service Name: attendance-db-new
Database Name: attendance_dashboard
Username: attendance_user
Password: nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19

Environment Variables (add these):
POSTGRES_INITDB_ARGS=--auth-host=md5
POSTGRES_HOST_AUTH_METHOD=md5
```

### Step 3: Update Application Environment Variables

**If you created new service, update DB_HOST:**

```env
# Update this line if you created new service
DB_HOST=attendance-db-new
```

## 🔧 PostgreSQL Service Commands

**If you can access PostgreSQL container, run:**

```bash
# Disable SSL in postgresql.conf
echo "ssl = off" >> /var/lib/postgresql/data/postgresql.conf

# Restart PostgreSQL
pg_ctl restart -D /var/lib/postgresql/data
```

## 📋 Complete Environment Variables

**Use these exact environment variables in your application:**

```env
# Database Configuration
DB_HOST=attendance-db
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19
DB_SSL=false

# JWT Security
JWT_SECRET=712154c1e504f6cb30c1510fe6f1b20b826da31c86c81bbb338650b82b961580a4f69c3bf19ea3ec96dcc6fc8316daf585c6dad3054d88be3e528bf5ec547c72

# Optional Redis (keep disabled for now)
REDIS_ENABLED=false
REDIS_HOST=disabled

# Application Settings
NODE_ENV=production
PORT=3002
```

## ✅ Quick Test

**After fixing PostgreSQL, test connection:**

1. **Check PostgreSQL logs** - should start without SSL errors
2. **Check application logs** - should show database connection
3. **Test login** at https://my.fullship.net

## 🚀 Expected Result

PostgreSQL should start successfully and show:
```
LOG: database system is ready to accept connections
```

Instead of:
```
FATAL: could not load private key file...
```

---
**The key is disabling SSL completely for Docker internal networking**
