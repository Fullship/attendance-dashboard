#!/bin/bash

# Attendance Dashboard - Complete Startup Script
# Handles dependencies, builds, and starts all three servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${CYAN}🚀 Attendance Dashboard - Complete Setup & Startup${NC}"
    echo -e "${CYAN}=================================================${NC}"
}

print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_status "Node.js $(node --version) detected"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    print_status "npm $(npm --version) detected"
}

# Check if PostgreSQL is running (for database)
check_database() {
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL CLI (psql) not found. Database might not be available."
        return 1
    fi
    
    # Try to connect to the database
    if PGPASSWORD=postgres psql -h localhost -U postgres -d attendance_dashboard_dev -c "SELECT 1;" &> /dev/null; then
        print_status "Database connection successful"
        return 0
    else
        print_warning "Database connection failed. Make sure PostgreSQL is running and configured."
        return 1
    fi
}

# Install dependencies for a specific directory
install_dependencies() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        print_info "Installing $name dependencies..."
        cd "$dir"
        
        if [ -f "package-lock.json" ]; then
            npm ci --silent
        else
            npm install --silent
        fi
        
        cd "$SCRIPT_DIR"
        print_status "$name dependencies installed"
    else
        print_warning "$name directory or package.json not found: $dir"
    fi
}

# Build MCP server TypeScript
build_mcp_server() {
    if [ -d "mcp-server" ] && [ -f "mcp-server/package.json" ]; then
        print_info "Building MCP server..."
        cd mcp-server
        
        # Check if dist directory exists and is up to date
        if [ -d "dist" ] && [ -f "dist/index.js" ]; then
            # Check if source files are newer than built files
            if [ "src/index.ts" -nt "dist/index.js" ]; then
                npm run build --silent
                print_status "MCP server rebuilt"
            else
                print_status "MCP server already built and up to date"
            fi
        else
            npm run build --silent
            print_status "MCP server built"
        fi
        
        cd "$SCRIPT_DIR"
    else
        print_warning "MCP server directory not found"
    fi
}

# Kill processes on specified ports
kill_port_processes() {
    local ports=("$@")
    
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            print_info "Killing existing processes on port $port..."
            echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
            sleep 1
            # Force kill if still running
            local remaining=$(lsof -ti :$port 2>/dev/null || true)
            if [ -n "$remaining" ]; then
                echo "$remaining" | xargs -r kill -KILL 2>/dev/null || true
            fi
            print_status "Port $port cleared"
        fi
    done
}

# Create logs directory
setup_logs() {
    mkdir -p logs
    print_status "Logs directory ready"
}

# Display usage
print_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --pm2              Use PM2 for process management"
    echo "  --dev              Development mode (default)"
    echo "  --prod             Production mode"
    echo "  --skip-deps        Skip dependency installation"
    echo "  --skip-build       Skip building MCP server"
    echo "  --skip-db-check    Skip database connectivity check"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Start in development mode with Node.js manager"
    echo "  $0 --pm2           # Start with PM2 process manager"
    echo "  $0 --prod --pm2    # Start in production mode with PM2"
}

# Parse command line arguments
USE_PM2=false
MODE="development"
SKIP_DEPS=false
SKIP_BUILD=false
SKIP_DB_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --pm2)
            USE_PM2=true
            shift
            ;;
        --dev)
            MODE="development"
            shift
            ;;
        --prod)
            MODE="production"
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-db-check)
            SKIP_DB_CHECK=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header
    
    print_section "System Requirements Check"
    check_nodejs
    check_npm
    
    if [ "$SKIP_DB_CHECK" = false ]; then
        check_database
    fi
    
    print_section "Environment Setup"
    setup_logs
    
    if [ "$SKIP_DEPS" = false ]; then
        print_section "Installing Dependencies"
        install_dependencies "." "Root project"
        install_dependencies "backend" "Backend"
        install_dependencies "frontend" "Frontend"
        install_dependencies "mcp-server" "MCP Server"
        install_dependencies "mcp-bridge" "MCP Bridge"
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        print_section "Building Projects"
        build_mcp_server
    fi
    
    print_section "Preparing for Startup"
    print_info "Clearing ports 3001, 3002, 3003..."
    kill_port_processes 3001 3002 3003
    
    print_section "Starting Servers"
    
    if [ "$USE_PM2" = true ]; then
        # Check if PM2 is installed
        if ! command -v pm2 &> /dev/null; then
            print_error "PM2 is not installed. Installing PM2..."
            npm install -g pm2
        fi
        
        print_info "Starting with PM2 in $MODE mode..."
        
        if [ "$MODE" = "production" ]; then
            pm2 start ecosystem.unified.config.js --env production
        else
            pm2 start ecosystem.unified.config.js --env development
        fi
        
        print_status "All servers started with PM2!"
        echo ""
        print_info "PM2 Management Commands:"
        echo "  pm2 status                     # View status"
        echo "  pm2 logs                       # View logs"
        echo "  pm2 monit                      # Monitoring dashboard"
        echo "  pm2 restart attendance-backend # Restart backend"
        echo "  pm2 stop all                   # Stop all servers"
        echo "  pm2 delete all                 # Remove all servers"
        
    else
        print_info "Starting with Node.js manager..."
        node start-all-servers.js
    fi
}

# Trap for cleanup
cleanup() {
    print_info "Received signal, cleaning up..."
    if [ "$USE_PM2" = true ]; then
        pm2 stop all 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run main function
main "$@"
