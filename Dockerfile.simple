# Simple Dockerfile for Coolify deployment
# This approach serves the frontend as static files and runs backend separately

FROM node:18-alpine AS frontend-builder

# Build frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend-builder

# Prepare backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

FROM node:18-alpine AS production

# Install nginx and curl
RUN apk add --no-cache nginx curl dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Set up nginx directories
RUN mkdir -p /var/cache/nginx /var/log/nginx /run/nginx && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log

# Copy application files
WORKDIR /app
COPY --from=backend-builder /app ./backend
COPY --from=frontend-builder /app/build ./frontend

# Simple nginx config for single container
RUN echo 'events { worker_connections 1024; }' > /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '  default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '  sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '  keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 80;' >> /etc/nginx/nginx.conf && \
    echo '    server_name localhost;' >> /etc/nginx/nginx.conf && \
    echo '    root /app/frontend;' >> /etc/nginx/nginx.conf && \
    echo '    index index.html;' >> /etc/nginx/nginx.conf && \
    echo '    location / {' >> /etc/nginx/nginx.conf && \
    echo '      try_files $uri $uri/ /index.html;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location /api/ {' >> /etc/nginx/nginx.conf && \
    echo '      proxy_pass http://127.0.0.1:3002;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Host $host;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location /health {' >> /etc/nginx/nginx.conf && \
    echo '      return 200 "healthy\\n";' >> /etc/nginx/nginx.conf && \
    echo '      add_header Content-Type text/plain;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting services..."' >> /app/start.sh && \
    echo 'nginx &' >> /app/start.sh && \
    echo 'echo "Nginx started"' >> /app/start.sh && \
    echo 'cd /app/backend' >> /app/start.sh && \
    echo 'echo "Starting backend..."' >> /app/start.sh && \
    echo 'exec node cluster-server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set permissions
RUN chown -R appuser:nodejs /app && \
    chown -R appuser:nodejs /var/cache/nginx && \
    chown -R appuser:nodejs /var/log/nginx && \
    chown -R appuser:nodejs /run/nginx

USER appuser

EXPOSE 80 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start.sh"]
