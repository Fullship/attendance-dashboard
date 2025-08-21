#!/bin/bash

# PM2 Management Script for Attendance Dashboard
# This script provides easy commands for managing PM2 processes

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PM2_CONFIG="ecosystem.config.js"
APP_NAME="attendance-dashboard-api"
WORKER_NAME="attendance-dashboard-worker"

print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}🚀 Attendance Dashboard PM2 Manager${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        print_status "PM2 installed successfully"
    fi
}

install_dependencies() {
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
    print_status "Dependencies installed"
}

# Start all applications
start_apps() {
    print_header
    check_pm2
    install_dependencies
    
    print_status "Starting all applications in cluster mode..."
    
    # Start with ecosystem config
    pm2 start $PM2_CONFIG
    
    # Display status
    pm2 status
    
    print_status "✅ All applications started successfully!"
    print_status "📊 View logs: pm2 logs"
    print_status "📈 Monitor: pm2 monit"
}

# Start production mode
start_production() {
    print_header
    check_pm2
    install_dependencies
    
    print_status "Starting applications in production mode..."
    
    # Start with production environment
    pm2 start $PM2_CONFIG --env production
    
    # Save PM2 process list for auto-restart on system reboot
    pm2 save
    pm2 startup
    
    pm2 status
    print_status "✅ Production applications started!"
}

# Stop all applications
stop_apps() {
    print_status "Stopping all applications..."
    pm2 stop $PM2_CONFIG
    print_status "✅ All applications stopped"
}

# Restart all applications
restart_apps() {
    print_status "Restarting all applications..."
    pm2 restart $PM2_CONFIG
    print_status "✅ All applications restarted"
}

# Reload applications (zero-downtime)
reload_apps() {
    print_status "Reloading applications with zero downtime..."
    pm2 reload $PM2_CONFIG
    print_status "✅ Applications reloaded"
}

# Delete all applications
delete_apps() {
    print_warning "This will delete all PM2 processes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        pm2 delete $PM2_CONFIG
        print_status "✅ All applications deleted"
    else
        print_status "Operation cancelled"
    fi
}

# Show application status
show_status() {
    print_header
    pm2 status
    echo ""
    pm2 info $APP_NAME
    echo ""
    pm2 info $WORKER_NAME
}

# Show logs
show_logs() {
    local app_name=${1:-"all"}
    if [ "$app_name" = "all" ]; then
        pm2 logs
    else
        pm2 logs $app_name
    fi
}

# Monitor applications
monitor_apps() {
    print_status "Opening PM2 monitoring dashboard..."
    pm2 monit
}

# Performance monitoring
show_performance() {
    print_header
    echo -e "${BLUE}📊 Performance Statistics${NC}"
    echo "================================="
    
    pm2 describe $APP_NAME | grep -E "(cpu|memory|restart|uptime)"
    echo ""
    pm2 describe $WORKER_NAME | grep -E "(cpu|memory|restart|uptime)"
}

# Health check
health_check() {
    print_header
    echo -e "${BLUE}🏥 Health Check${NC}"
    echo "==================="
    
    # Check if processes are running
    if pm2 jlist | jq -e ".[] | select(.name==\"$APP_NAME\" and .pm2_env.status==\"online\")" > /dev/null; then
        print_status "✅ API Server is healthy"
    else
        print_error "❌ API Server is not running"
    fi
    
    if pm2 jlist | jq -e ".[] | select(.name==\"$WORKER_NAME\" and .pm2_env.status==\"online\")" > /dev/null; then
        print_status "✅ Background Worker is healthy"
    else
        print_error "❌ Background Worker is not running"
    fi
    
    # Test API endpoint
    if curl -f -s http://localhost:3002/api/health > /dev/null; then
        print_status "✅ API endpoint is responding"
    else
        print_warning "⚠️ API endpoint is not responding"
    fi
}

# Backup PM2 configuration
backup_config() {
    local backup_file="pm2-backup-$(date +%Y%m%d_%H%M%S).json"
    pm2 save
    cp ~/.pm2/dump.pm2 "backups/$backup_file"
    print_status "✅ PM2 configuration backed up to backups/$backup_file"
}

# Show help
show_help() {
    print_header
    echo "Available commands:"
    echo ""
    echo -e "${GREEN}Basic Operations:${NC}"
    echo "  start         Start all applications in development mode"
    echo "  start-prod    Start all applications in production mode"
    echo "  stop          Stop all applications"
    echo "  restart       Restart all applications"
    echo "  reload        Reload applications with zero downtime"
    echo "  delete        Delete all applications"
    echo ""
    echo -e "${GREEN}Monitoring:${NC}"
    echo "  status        Show application status"
    echo "  logs [app]    Show logs (all apps or specific app)"
    echo "  monitor       Open PM2 monitoring dashboard"
    echo "  perf          Show performance statistics"
    echo "  health        Run health check"
    echo ""
    echo -e "${GREEN}Maintenance:${NC}"
    echo "  backup        Backup PM2 configuration"
    echo "  help          Show this help message"
    echo ""
    echo -e "${GREEN}Examples:${NC}"
    echo "  ./pm2-manager.sh start"
    echo "  ./pm2-manager.sh logs attendance-dashboard-api"
    echo "  ./pm2-manager.sh reload"
    echo ""
}

# Main command handling
case "${1:-help}" in
    "start")
        start_apps
        ;;
    "start-prod")
        start_production
        ;;
    "stop")
        stop_apps
        ;;
    "restart")
        restart_apps
        ;;
    "reload")
        reload_apps
        ;;
    "delete")
        delete_apps
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs $2
        ;;
    "monitor")
        monitor_apps
        ;;
    "perf")
        show_performance
        ;;
    "health")
        health_check
        ;;
    "backup")
        backup_config
        ;;
    "help"|*)
        show_help
        ;;
esac
