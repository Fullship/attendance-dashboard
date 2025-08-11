#!/bin/bash

# QUICK DEPLOYMENT SCRIPT
# Automates local testing before Coolify deployment

set -e  # Exit on any error

echo "🚀 Attendance Dashboard - Quick Deployment Test"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
print_status "Checking Docker availability..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check if required files exist
print_status "Checking required files..."
if [[ ! -f "Dockerfile" ]]; then
    print_error "Dockerfile not found. Please ensure it exists."
    exit 1
fi

if [[ ! -f "docker-compose.local.yml" ]]; then
    print_error "docker-compose.local.yml not found. Please ensure it exists."
    exit 1
fi

if [[ ! -f "init-database.sql" ]]; then
    print_warning "init-database.sql not found. Database initialization may fail."
fi

print_success "Required files found"

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local max_attempts=30
    local attempt=1

    print_status "Testing $description at $url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$description is responding"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "$description failed to respond after $max_attempts attempts"
            return 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
}

# Clean up Docker to avoid I/O issues
print_status "Cleaning up Docker system..."
docker system prune -f > /dev/null 2>&1 || true
print_success "Docker cleanup completed"

# Build the optimized Docker image
print_status "Building Docker image..."
if docker build -f Dockerfile -t attendance-dashboard:test .; then
    print_success "Docker image built successfully"
else
    print_error "Docker image build failed"
    print_status "Trying with more verbose output..."
    docker build -f Dockerfile -t attendance-dashboard:test . --progress=plain
    exit 1
fi

# Start the full stack
print_status "Starting full stack with Docker Compose..."
if docker-compose -f docker-compose.local.yml up -d; then
    print_success "Docker Compose stack started"
else
    print_error "Failed to start Docker Compose stack"
    exit 1
fi

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Test services
print_status "Testing services..."

# Test PostgreSQL
if docker-compose -f docker-compose.local.yml exec -T postgres pg_isready -U attendance_user -d attendance_dashboard > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL may not be ready yet"
fi

# Test Redis
if docker-compose -f docker-compose.local.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is ready"
else
    print_warning "Redis may not be ready yet"
fi

# Test application endpoints
test_endpoint "http://localhost:3002/health" "Health endpoint"
test_endpoint "http://localhost:3002/" "Frontend"
test_endpoint "http://localhost:3002/api/auth/login" "Auth API" || print_warning "Auth API may require POST request"

# Run basic API tests
print_status "Running basic API tests..."

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:3002/health 2>/dev/null || echo "failed")
if [[ $HEALTH_RESPONSE == *"healthy"* ]] || [[ $HEALTH_RESPONSE == *"status"* ]]; then
    print_success "Health endpoint returns valid response"
else
    print_warning "Health endpoint response may be unexpected: $HEALTH_RESPONSE"
fi

# Test frontend
FRONTEND_RESPONSE=$(curl -s -I http://localhost:3002/ 2>/dev/null | head -n 1 || echo "failed")
if [[ $FRONTEND_RESPONSE == *"200"* ]]; then
    print_success "Frontend serves successfully"
else
    print_warning "Frontend response: $FRONTEND_RESPONSE"
fi

# Test admin login (should fail without credentials, but shouldn't be 500)
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@company.com","password":"admin123"}' \
    http://localhost:3002/api/auth/login 2>/dev/null || echo "000")

if [[ $LOGIN_RESPONSE == "200" ]]; then
    print_success "Login endpoint works (credentials accepted)"
elif [[ $LOGIN_RESPONSE == "400" ]] || [[ $LOGIN_RESPONSE == "401" ]]; then
    print_success "Login endpoint works (validation/auth error as expected)"
else
    print_warning "Login endpoint returned HTTP $LOGIN_RESPONSE"
fi

echo ""
echo "🧪 MANUAL TESTING INSTRUCTIONS:"
echo "================================"
echo "Frontend: http://localhost:3002/"
echo "Health:   http://localhost:3002/health"
echo "API:      http://localhost:3002/api/"
echo "Admin:    http://localhost:3002/api/admin/"
echo "Adminer:  http://localhost:8080/ (Database UI)"
echo ""
echo "To stop the stack:"
echo "docker-compose -f docker-compose.local.yml down"
echo ""

# Show service status
print_status "Service Status:"
docker-compose -f docker-compose.local.yml ps

# Show recent logs
print_status "Recent application logs:"
docker-compose -f docker-compose.local.yml logs --tail=20 app

echo ""
print_success "Local testing completed!"
echo "If everything looks good, proceed with Coolify deployment using:"
echo "- Dockerfile (optimized multi-stage build)"
echo "- Environment variables from .env.production.template"
echo "- Configuration from DEPLOYMENT_GUIDE.md"
