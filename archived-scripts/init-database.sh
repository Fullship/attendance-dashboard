#!/bin/bash

# Database initialization script for Attendance Dashboard
# This script helps initialize the database after PostgreSQL is set up in Coolify

echo "🚀 Attendance Dashboard Database Initialization Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required variables are set
echo "🔍 Checking environment variables..."

if [ -z "$DB_HOST" ]; then
    print_error "DB_HOST is not set"
    exit 1
fi

if [ -z "$DB_NAME" ]; then
    print_error "DB_NAME is not set"
    exit 1
fi

if [ -z "$DB_USER" ]; then
    print_error "DB_USER is not set"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD is not set"
    exit 1
fi

print_status "All required environment variables are set"

# Test database connection
echo "🔌 Testing database connection..."
export PGPASSWORD="$DB_PASSWORD"

if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Database connection successful"
else
    print_error "Cannot connect to database"
    echo "Host: $DB_HOST"
    echo "Port: ${DB_PORT:-5432}"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    exit 1
fi

# Initialize database schema
echo "📊 Initializing database schema..."
if psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -f "database-init.sql"; then
    print_status "Database schema initialized successfully"
else
    print_error "Failed to initialize database schema"
    exit 1
fi

# Verify tables were created
echo "✅ Verifying table creation..."
TABLES=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if echo "$TABLES" | grep -q "users"; then
    print_status "Users table created"
else
    print_error "Users table not found"
fi

if echo "$TABLES" | grep -q "attendance"; then
    print_status "Attendance table created"
else
    print_warning "Attendance table not found"
fi

if echo "$TABLES" | grep -q "leave_requests"; then
    print_status "Leave requests table created"
else
    print_warning "Leave requests table not found"
fi

# Check if admin users were created
echo "👤 Checking admin users..."
ADMIN_COUNT=$(psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE is_admin = true;" 2>/dev/null | tr -d ' ')

if [ "$ADMIN_COUNT" -gt 0 ]; then
    print_status "Admin users created successfully ($ADMIN_COUNT admin users found)"
    echo "Default admin credentials:"
    echo "  Email: admin@company.com"
    echo "  Password: admin123"
    echo ""
    echo "Test admin credentials:"
    echo "  Email: testadmin@example.com"
    echo "  Password: admin123"
else
    print_warning "No admin users found"
fi

echo ""
echo "🎉 Database initialization completed!"
echo ""
echo "Next steps:"
echo "1. Deploy your application in Coolify"
echo "2. Test login with admin credentials"
echo "3. Access your dashboard at https://my.fullship.net"
echo ""
print_status "Your attendance dashboard is ready to use!"
