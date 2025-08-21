#!/bin/bash

# Production Deployment Script for Attendance Dashboard
# This script builds and deploys the complete application stack

set -e

echo "🚀 Starting Attendance Dashboard Production Deployment"

# Configuration
PROJECT_NAME="attendance-dashboard"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v npm >/dev/null 2>&1 || error "npm is not installed"
    
    # Check if ports are available
    if netstat -tuln | grep -q ":80 "; then
        warn "Port 80 is already in use"
    fi
    if netstat -tuln | grep -q ":443 "; then
        warn "Port 443 is already in use"
    fi
    
    log "Prerequisites check completed"
}

# Create backup of existing deployment
create_backup() {
    if [ -d "frontend/build" ] || docker ps -q -f name="$PROJECT_NAME" | grep -q .; then
        log "Creating backup..."
        mkdir -p "$BACKUP_DIR"
        
        # Backup built frontend
        if [ -d "frontend/build" ]; then
            cp -r frontend/build "$BACKUP_DIR/"
        fi
        
        # Export database if running
        if docker ps -q -f name="${PROJECT_NAME}_postgres" | grep -q .; then
            docker exec "${PROJECT_NAME}_postgres_1" pg_dump -U admin attendance_dashboard > "$BACKUP_DIR/database_backup.sql"
        fi
        
        log "Backup created at $BACKUP_DIR"
    fi
}

# Build React frontend
build_frontend() {
    log "Building React frontend..."
    cd frontend
    
    # Install dependencies
    npm ci --production=false
    
    # Build for production
    REACT_APP_API_URL=https://localhost npm run build
    
    cd ..
    log "Frontend build completed"
}

# Stop existing containers
stop_existing() {
    log "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down || true
    docker system prune -f || true
}

# Deploy with Docker Compose
deploy_containers() {
    log "Deploying containers..."
    
    # Build and start all services
    docker-compose -f docker-compose.production.yml up --build -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    services=("postgres" "redis" "backend" "nginx")
    
    for service in "${services[@]}"; do
        container_name="${PROJECT_NAME}_${service}_1"
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*healthy\|Up"; then
            log "✅ $service is healthy"
        else
            error "❌ $service is not healthy"
        fi
    done
}

# Setup SSL certificates (Let's Encrypt)
setup_ssl() {
    read -p "Do you want to setup SSL certificates with Let's Encrypt? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Setting up SSL certificates..."
        
        # Get domain name
        read -p "Enter your domain name: " DOMAIN_NAME
        
        # Stop nginx temporarily
        docker-compose -f docker-compose.production.yml stop nginx
        
        # Run certbot
        docker run -it --rm \
            -v "${PWD}/ssl-certs:/etc/letsencrypt" \
            -p 80:80 \
            certbot/certbot certonly \
            --standalone \
            -d "$DOMAIN_NAME" \
            --agree-tos \
            --no-eff-email
        
        # Update nginx config with real certificates
        sed -i "s|/etc/ssl/certs/attendance-dashboard.crt|/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem|g" nginx.conf
        sed -i "s|/etc/ssl/private/attendance-dashboard.key|/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem|g" nginx.conf
        
        # Restart nginx
        docker-compose -f docker-compose.production.yml up -d nginx
        
        log "SSL certificates configured for $DOMAIN_NAME"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p monitoring/logs
    mkdir -p monitoring/metrics
    
    # Setup log rotation
    cat > monitoring/logrotate.conf << EOF
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 nginx nginx
    postrotate
        docker exec ${PROJECT_NAME}_nginx_1 nginx -s reload
    endscript
}
EOF
    
    log "Monitoring setup completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Test HTTP endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
        log "✅ HTTP endpoint is responding"
    else
        error "❌ HTTP endpoint is not responding"
    fi
    
    # Test API endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health | grep -q "200"; then
        log "✅ API endpoint is responding"
    else
        warn "⚠️ API endpoint is not responding (this may be normal if /api/health doesn't exist)"
    fi
    
    # Test WebSocket connection (basic check)
    if curl -s -I -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/socket.io/ | grep -q "HTTP/1.1"; then
        log "✅ WebSocket endpoint is accessible"
    else
        warn "⚠️ WebSocket endpoint test inconclusive"
    fi
}

# Main deployment process
main() {
    log "=== Attendance Dashboard Production Deployment ==="
    
    check_prerequisites
    create_backup
    build_frontend
    stop_existing
    deploy_containers
    setup_ssl
    setup_monitoring
    verify_deployment
    
    log "🎉 Deployment completed successfully!"
    log "📊 Dashboard: https://localhost (or your domain)"
    log "📈 Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
    log "🔍 Check status: docker-compose -f docker-compose.production.yml ps"
    
    # Show useful commands
    echo
    echo "=== Useful Commands ==="
    echo "View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "Stop all: docker-compose -f docker-compose.production.yml down"
    echo "Restart service: docker-compose -f docker-compose.production.yml restart <service>"
    echo "Check status: docker-compose -f docker-compose.production.yml ps"
}

# Handle interruption
trap 'echo -e "\n${RED}Deployment interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"
