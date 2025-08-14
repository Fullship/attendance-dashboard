#!/bin/bash

# Development Environment Manager
# Switches between local development and production configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo -e "${BLUE}Development Environment Manager${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  local     - Switch to local development environment"
    echo "  prod      - Switch to production environment"
    echo "  status    - Show current environment configuration"
    echo "  setup     - Setup local development environment"
    echo "  start     - Start local development servers"
    echo "  stop      - Stop local development servers"
    echo "  db:start  - Start local PostgreSQL (Docker)"
    echo "  db:stop   - Stop local PostgreSQL (Docker)"
    echo "  db:reset  - Reset local database"
    echo "  help      - Show this help message"
}

switch_to_local() {
    echo -e "${YELLOW}Switching to local development environment...${NC}"
    
    # Copy local environment files
    if [ -f ".env.local" ]; then
        cp .env.local .env
        echo -e "${GREEN}✓ Backend environment set to local${NC}"
    else
        echo -e "${RED}✗ .env.local not found${NC}"
        exit 1
    fi
    
    if [ -f "frontend/.env.local" ]; then
        cp frontend/.env.local frontend/.env
        echo -e "${GREEN}✓ Frontend environment set to local${NC}"
    else
        echo -e "${RED}✗ frontend/.env.local not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Switched to local development environment${NC}"
}

switch_to_prod() {
    echo -e "${YELLOW}Switching to production environment...${NC}"
    
    # Copy production environment files
    if [ -f ".env.coolify" ]; then
        cp .env.coolify .env
        echo -e "${GREEN}✓ Backend environment set to production${NC}"
    else
        echo -e "${RED}✗ .env.coolify not found${NC}"
        exit 1
    fi
    
    if [ -f "frontend/.env.production" ]; then
        cp frontend/.env.production frontend/.env
        echo -e "${GREEN}✓ Frontend environment set to production${NC}"
    else
        # Create production frontend env if it doesn't exist
        cat > frontend/.env << EOF
REACT_APP_API_URL=https://my.fullship.net/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
EOF
        echo -e "${GREEN}✓ Frontend environment set to production${NC}"
    fi
    
    echo -e "${GREEN}✓ Switched to production environment${NC}"
}

show_status() {
    echo -e "${BLUE}Current Environment Status:${NC}"
    echo ""
    
    if [ -f ".env" ]; then
        NODE_ENV=$(grep "NODE_ENV=" .env | cut -d'=' -f2)
        DB_HOST=$(grep "DB_HOST=" .env | cut -d'=' -f2)
        FRONTEND_URL=$(grep "FRONTEND_URL=" .env | cut -d'=' -f2)
        
        echo -e "Backend Environment: ${GREEN}$NODE_ENV${NC}"
        echo -e "Database Host: ${GREEN}$DB_HOST${NC}"
        echo -e "Frontend URL: ${GREEN}$FRONTEND_URL${NC}"
    else
        echo -e "${RED}No .env file found${NC}"
    fi
    
    echo ""
    
    if [ -f "frontend/.env" ]; then
        API_URL=$(grep "REACT_APP_API_URL=" frontend/.env | cut -d'=' -f2)
        echo -e "Frontend API URL: ${GREEN}$API_URL${NC}"
    else
        echo -e "${RED}No frontend/.env file found${NC}"
    fi
}

setup_local() {
    echo -e "${YELLOW}Setting up local development environment...${NC}"
    
    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm run setup
    
    # Start local database if not running
    start_local_db
    
    # Setup database
    echo -e "${BLUE}Setting up local database...${NC}"
    switch_to_local
    
    echo -e "${GREEN}✓ Local development environment setup complete${NC}"
    echo -e "${YELLOW}Run 'npm run dev' to start development servers${NC}"
}

start_dev() {
    echo -e "${YELLOW}Starting local development servers...${NC}"
    switch_to_local
    
    # Check if database is running
    if ! docker ps | grep -q postgres-dev; then
        echo -e "${YELLOW}Starting local database...${NC}"
        start_local_db
    fi
    
    # Start development servers using concurrently
    npm run dev:legacy
}

stop_dev() {
    echo -e "${YELLOW}Stopping development servers...${NC}"
    
    # Kill any node processes on development ports
    pkill -f "node.*3002" || true
    pkill -f "react-scripts" || true
    
    echo -e "${GREEN}✓ Development servers stopped${NC}"
}

start_local_db() {
    echo -e "${YELLOW}Starting local PostgreSQL database...${NC}"
    
    # Create docker-compose file for local database
    cat > docker-compose.dev.yml << EOF
version: '3.8'
services:
  postgres-dev:
    image: postgres:15
    environment:
      POSTGRES_DB: attendance_dashboard_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-dev:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_dev_data:/data

volumes:
  postgres_dev_data:
  redis_dev_data:
EOF
    
    docker-compose -f docker-compose.dev.yml up -d
    
    # Wait for database to be ready
    echo -e "${BLUE}Waiting for database to be ready...${NC}"
    sleep 5
    
    echo -e "${GREEN}✓ Local database started${NC}"
}

stop_local_db() {
    echo -e "${YELLOW}Stopping local database...${NC}"
    
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml down
        echo -e "${GREEN}✓ Local database stopped${NC}"
    else
        echo -e "${RED}No local database configuration found${NC}"
    fi
}

reset_local_db() {
    echo -e "${YELLOW}Resetting local database...${NC}"
    
    # Stop and remove database
    stop_local_db
    docker volume rm attendance-dashboard_postgres_dev_data 2>/dev/null || true
    docker volume rm attendance-dashboard_redis_dev_data 2>/dev/null || true
    
    # Start fresh database
    start_local_db
    
    echo -e "${GREEN}✓ Local database reset complete${NC}"
}

# Main script logic
case "$1" in
    "local")
        switch_to_local
        ;;
    "prod")
        switch_to_prod
        ;;
    "status")
        show_status
        ;;
    "setup")
        setup_local
        ;;
    "start")
        start_dev
        ;;
    "stop")
        stop_dev
        ;;
    "db:start")
        start_local_db
        ;;
    "db:stop")
        stop_local_db
        ;;
    "db:reset")
        reset_local_db
        ;;
    "help"|"--help"|"-h")
        print_usage
        ;;
    "")
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
