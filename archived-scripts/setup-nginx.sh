#!/bin/bash

# Nginx Setup Script for Attendance Dashboard
# Usage: ./setup-nginx.sh

set -e

# Configuration variables
DOMAIN="attendance-dashboard.yourdomain.com"
APP_DIR="/var/www/attendance-dashboard"
NGINX_CONF_SOURCE="./nginx.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/attendance-dashboard"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled/attendance-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Nginx for Attendance Dashboard${NC}"
echo "=============================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   echo "Please run as a user with sudo privileges"
   exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Nginx...${NC}"
    sudo apt update
    sudo apt install -y nginx
fi

# Check if Node.js backend is configured
if ! systemctl is-active --quiet attendance-backend 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Backend service not found. You'll need to set up the Node.js backend service.${NC}"
fi

# Create application directory
echo -e "${BLUE}📁 Creating application directories...${NC}"
sudo mkdir -p $APP_DIR/build
sudo mkdir -p /var/cache/nginx/attendance
sudo mkdir -p /var/log/nginx

# Set proper permissions
sudo chown -R www-data:www-data $APP_DIR
sudo chown -R www-data:www-data /var/cache/nginx/attendance

# Copy Nginx configuration
echo -e "${BLUE}⚙️  Installing Nginx configuration...${NC}"
if [ ! -f "$NGINX_CONF_SOURCE" ]; then
    echo -e "${RED}❌ nginx.conf not found in current directory${NC}"
    exit 1
fi

sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST"

# Update domain in configuration
read -p "Enter your domain name (default: $DOMAIN): " USER_DOMAIN
if [ ! -z "$USER_DOMAIN" ]; then
    DOMAIN="$USER_DOMAIN"
fi

echo -e "${BLUE}🔧 Updating domain to: $DOMAIN${NC}"
sudo sed -i "s/attendance-dashboard\.yourdomain\.com/$DOMAIN/g" "$NGINX_CONF_DEST"

# Enable site
echo -e "${BLUE}🔗 Enabling Nginx site...${NC}"
if [ -L "$NGINX_CONF_ENABLED" ]; then
    sudo rm "$NGINX_CONF_ENABLED"
fi
sudo ln -s "$NGINX_CONF_DEST" "$NGINX_CONF_ENABLED"

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo -e "${BLUE}🗑️  Removing default Nginx site...${NC}"
    sudo rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo -e "${BLUE}🧪 Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

# SSL Certificate setup
echo -e "${YELLOW}🔐 SSL Certificate Setup${NC}"
echo "You have several options for SSL certificates:"
echo "1. Let's Encrypt (free, automated)"
echo "2. Self-signed (for testing)"
echo "3. Custom certificate (manual setup)"

read -p "Choose option (1/2/3): " SSL_OPTION

case $SSL_OPTION in
    1)
        echo -e "${BLUE}🔐 Setting up Let's Encrypt...${NC}"
        if ! command -v certbot &> /dev/null; then
            sudo apt install -y certbot python3-certbot-nginx
        fi
        sudo certbot --nginx -d $DOMAIN
        ;;
    2)
        echo -e "${BLUE}🔐 Creating self-signed certificate...${NC}"
        sudo mkdir -p /etc/ssl/private /etc/ssl/certs
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/attendance-dashboard.key \
            -out /etc/ssl/certs/attendance-dashboard.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        echo -e "${YELLOW}⚠️  Self-signed certificate created. Not recommended for production.${NC}"
        ;;
    3)
        echo -e "${YELLOW}📋 Manual certificate setup required:${NC}"
        echo "- Place your certificate at: /etc/ssl/certs/attendance-dashboard.crt"
        echo "- Place your private key at: /etc/ssl/private/attendance-dashboard.key"
        echo "- Ensure proper file permissions (600 for key, 644 for cert)"
        ;;
esac

# Build React application
echo -e "${BLUE}🏗️  Building React application...${NC}"
if [ -d "./frontend" ]; then
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
        npm install
    fi
    
    echo -e "${BLUE}🔨 Building production bundle...${NC}"
    npm run build
    
    echo -e "${BLUE}📂 Copying build files...${NC}"
    sudo cp -r build/* $APP_DIR/build/
    sudo chown -R www-data:www-data $APP_DIR/build
    cd ..
else
    echo -e "${YELLOW}⚠️  Frontend directory not found. Please manually copy your React build to $APP_DIR/build/${NC}"
fi

# Create systemd service for Node.js backend
echo -e "${BLUE}🔧 Creating backend systemd service...${NC}"

cat > /tmp/attendance-backend.service << EOF
[Unit]
Description=Attendance Dashboard Backend
Documentation=https://github.com/your-org/attendance-dashboard
After=network.target

[Service]
Environment=NODE_ENV=production
Environment=PORT=3002
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=attendance-backend

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/attendance-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable attendance-backend

# Copy backend files
if [ -d "./backend" ]; then
    echo -e "${BLUE}📂 Copying backend files...${NC}"
    sudo mkdir -p $APP_DIR/backend
    sudo cp -r backend/* $APP_DIR/backend/
    sudo chown -R www-data:www-data $APP_DIR/backend
    
    # Install backend dependencies
    cd $APP_DIR/backend
    sudo -u www-data npm install --production
    cd - > /dev/null
fi

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
sudo systemctl start attendance-backend
sudo systemctl reload nginx

# Setup log rotation
echo -e "${BLUE}📝 Setting up log rotation...${NC}"
cat > /tmp/attendance-logrotate << EOF
/var/log/nginx/attendance-dashboard_*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \`cat /var/run/nginx.pid\`
        fi
    endscript
}
EOF

sudo mv /tmp/attendance-logrotate /etc/logrotate.d/attendance-dashboard

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    echo -e "${BLUE}🔥 Configuring firewall...${NC}"
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
fi

# Final status check
echo -e "${GREEN}✅ Setup completed!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
sudo systemctl status attendance-backend --no-pager -l || true
sudo systemctl status nginx --no-pager -l || true

echo ""
echo -e "${BLUE}🌐 Your application should be accessible at:${NC}"
echo -e "  HTTPS: ${GREEN}https://$DOMAIN${NC}"
echo -e "  API:   ${GREEN}https://$DOMAIN/api/health${NC}"

echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Update your DNS to point $DOMAIN to this server"
echo "2. Test the application: https://$DOMAIN"
echo "3. Check logs: sudo tail -f /var/log/nginx/attendance-dashboard_*.log"
echo "4. Monitor backend: sudo journalctl -u attendance-backend -f"

echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "- Restart backend: sudo systemctl restart attendance-backend"
echo "- Reload Nginx: sudo systemctl reload nginx"
echo "- Check config: sudo nginx -t"
echo "- View logs: sudo tail -f /var/log/nginx/attendance-dashboard_error.log"
