#!/bin/bash

# Coolify Deployment Validation Script
# Run this script to validate your setup before deploying to Coolify

echo "🚀 Coolify Deployment Validation for Attendance Dashboard"
echo "========================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$2" = "success" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    elif [ "$2" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $1${NC}"
    elif [ "$2" = "error" ]; then
        echo -e "${RED}❌ $1${NC}"
    else
        echo -e "${BLUE}ℹ️  $1${NC}"
    fi
}

# Check if required files exist
print_status "Checking required files..." "info"

files_to_check=(
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "docker-compose.coolify.yml"
    ".env.coolify"
    "COOLIFY_DEPLOYMENT_GUIDE.md"
    "backend/healthcheck.js"
    "frontend/nginx.conf"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file exists" "success"
    else
        print_status "$file missing" "error"
    fi
done

# Check package.json files
print_status "\nChecking package.json files..." "info"

if [ -f "backend/package.json" ]; then
    print_status "Backend package.json exists" "success"
else
    print_status "Backend package.json missing" "error"
fi

if [ -f "frontend/package.json" ]; then
    print_status "Frontend package.json exists" "success"
else
    print_status "Frontend package.json missing" "error"
fi

# Check for potential Docker build issues
print_status "\nChecking for potential Docker build issues..." "info"

# Check if .dockerignore exists
if [ -f ".dockerignore" ]; then
    print_status "Root .dockerignore exists" "success"
else
    print_status "Root .dockerignore missing (recommended)" "warning"
fi

if [ -f "frontend/.dockerignore" ]; then
    print_status "Frontend .dockerignore exists" "success"
else
    print_status "Frontend .dockerignore missing (recommended)" "warning"
fi

# Check for node_modules (should not be present for production builds)
if [ -d "backend/node_modules" ]; then
    print_status "Backend node_modules found (will be ignored by Docker)" "warning"
fi

if [ -d "frontend/node_modules" ]; then
    print_status "Frontend node_modules found (will be ignored by Docker)" "warning"
fi

# Check environment configuration
print_status "\nChecking environment configuration..." "info"

if [ -f ".env.coolify" ]; then
    # Check if critical environment variables are defined
    if grep -q "DB_HOST" .env.coolify; then
        print_status "Database configuration found" "success"
    else
        print_status "Database configuration missing in .env.coolify" "warning"
    fi
    
    if grep -q "JWT_SECRET" .env.coolify; then
        print_status "JWT configuration found" "success"
    else
        print_status "JWT configuration missing in .env.coolify" "warning"
    fi
    
    if grep -q "REDIS_HOST" .env.coolify; then
        print_status "Redis configuration found" "success"
    else
        print_status "Redis configuration missing in .env.coolify" "warning"
    fi
fi

# Check if Docker is available (optional)
print_status "\nChecking Docker availability..." "info"
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        print_status "Docker is available and running" "success"
        
        # Test build (commented out to avoid long build times)
        # print_status "Testing Docker builds..." "info"
        # docker build -t test-backend ./backend
        # docker build -t test-frontend ./frontend
    else
        print_status "Docker is installed but not running" "warning"
    fi
else
    print_status "Docker not found (not required for Coolify deployment)" "info"
fi

# Summary
print_status "\n📋 Pre-deployment Checklist:" "info"
echo ""
echo "Before deploying to Coolify, ensure you have:"
echo "1. ✅ PostgreSQL database created in Coolify"
echo "2. ✅ Redis instance created in Coolify"
echo "3. ✅ Domain names configured (optional but recommended)"
echo "4. ✅ Environment variables configured in Coolify"
echo "5. ✅ Git repository accessible by Coolify"
echo ""

print_status "🎯 Next Steps:" "info"
echo ""
echo "1. Push this code to your Git repository"
echo "2. Create a new Docker Compose resource in Coolify"
echo "3. Point it to your repository and branch"
echo "4. Configure environment variables using .env.coolify as reference"
echo "5. Deploy and monitor the health checks"
echo ""

print_status "📚 For detailed instructions, see COOLIFY_DEPLOYMENT_GUIDE.md" "info"
echo ""
print_status "Validation complete! 🎉" "success"
