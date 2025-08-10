#!/bin/bash

#!/bin/bash

# Production Deployment Script for my.fullship.net
# This script packages and prepares the application for production deployment

set -e

echo "🚀 Deploying Attendance Dashboard to my.fullship.net"

# Configuration
DOMAIN="my.fullship.net"
PROJECT_NAME="attendance-dashboard"
BUILD_DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Please run this script from the project root."
fi

log "🔧 Pre-deployment preparation"

# 1. Update environment variables for production
log "📝 Updating environment variables for my.fullship.net"

# Update backend environment
cat > backend/.env.production << EOF
# Production Environment - my.fullship.net
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://my.fullship.net

# Database Configuration (Update with your production DB)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_dashboard
DB_USER=attendance_user
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD

# JWT Secret (Change this to a secure random string)
JWT_SECRET=YOUR_SECURE_JWT_SECRET_${BUILD_DATE}

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration (Update with your SMTP settings)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Datadog Configuration (Optional - update with your keys)
DD_API_KEY=your-datadog-api-key
DD_SERVICE=attendance-dashboard-api
DD_ENV=production
DD_VERSION=1.0.0
EOF

log "✅ Environment files updated"

# 2. Install dependencies
log "📦 Installing production dependencies"
npm run setup

# 3. Build frontend for production
log "🏗️ Building frontend for production"
cd frontend
npm run build
cd ..

log "✅ Frontend build completed"

# 4. Create production Docker configuration
log "🐳 Creating production Docker configuration"

cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./frontend/build:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - attendance-network
    restart: unless-stopped

  # Backend API Server
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3002
      - FRONTEND_URL=https://my.fullship.net
    volumes:
      - ./backend/.env.production:/app/.env
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    networks:
      - attendance-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: attendance_dashboard
      POSTGRES_USER: attendance_user
      POSTGRES_PASSWORD: YOUR_SECURE_DB_PASSWORD
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - attendance-network
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - attendance-network
    restart: unless-stopped

networks:
  attendance-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
EOF

# 5. Create production Nginx configuration
log "🌐 Creating Nginx configuration for my.fullship.net"

cat > nginx.prod.conf << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

    # SSL Configuration (when you have SSL certificates)
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    # ssl_prefer_server_ciphers off;

    # Main server block
    server {
        listen 80;
        server_name my.fullship.net;
        
        # Redirect HTTP to HTTPS (uncomment when SSL is configured)
        # return 301 https://\$server_name\$request_uri;
        
        # For now, serve over HTTP (remove this when SSL is configured)
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # API requests
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend:3002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Socket.IO
        location /socket.io/ {
            proxy_pass http://backend:3002;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Frontend static files
        location / {
            try_files \$uri \$uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # HTTPS server block (uncomment when SSL certificates are available)
    # server {
    #     listen 443 ssl http2;
    #     server_name my.fullship.net;
    #     
    #     ssl_certificate /etc/nginx/ssl/fullchain.pem;
    #     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    #     
    #     # Include the same location blocks as above
    # }
}
EOF

# 6. Create PM2 production configuration
log "⚙️ Creating PM2 production configuration"

cat > ecosystem.production.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'attendance-dashboard-api',
      script: './backend/server.js',
      
      // Production configuration
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        FRONTEND_URL: 'https://my.fullship.net',
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      
      // Performance
      kill_timeout: 5000,
      listen_timeout: 8000,
      instance_var: 'INSTANCE_ID',
    }
  ]
};
EOF

# 7. Create deployment archive
log "📦 Creating deployment archive"
ARCHIVE_NAME="${PROJECT_NAME}-production-${BUILD_DATE}.tar.gz"

tar -czf "\$ARCHIVE_NAME" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=*.log \
    --exclude=backend/uploads/* \
    --exclude=frontend/build/static/media \
    frontend/build/ \
    backend/ \
    database/ \
    docker-compose.prod.yml \
    nginx.prod.conf \
    ecosystem.production.config.js \
    package.json

log "✅ Deployment archive created: \$ARCHIVE_NAME"

# 8. Display deployment instructions
echo ""
log "🎉 Production build completed!"
echo ""
info "📋 Next steps to deploy to my.fullship.net:"
echo ""
echo "1. Upload the archive to your server:"
echo "   scp \$ARCHIVE_NAME user@my.fullship.net:/path/to/deployment/"
echo ""
echo "2. On your server, extract and setup:"
echo "   tar -xzf \$ARCHIVE_NAME"
echo "   cd attendance-dashboard"
echo ""
echo "3. Install Docker and Docker Compose on your server"
echo ""
echo "4. Update database credentials in docker-compose.prod.yml"
echo ""
echo "5. Start the application:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "6. Or use PM2 for Node.js deployment:"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.production.config.js --env production"
echo ""
warn "⚠️  Remember to:"
echo "   - Update database passwords in docker-compose.prod.yml"
echo "   - Configure SSL certificates for HTTPS"
echo "   - Set up proper firewall rules"
echo "   - Configure domain DNS to point to your server"
echo ""
info "🔗 Your application will be available at: https://my.fullship.net"
