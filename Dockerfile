# COOLIFY OPTIMIZED DOCKERFILE - UPDATED FOR YOUR DOMAIN
# Date: 2025-08-11
# Single-stage build for Coolify deployment with your specific domain
FROM node:18-alpine

# Build argument to prevent caching issues
ARG CACHEBUST=20250811
RUN echo "Cache bust: $CACHEBUST"

# Install necessary packages including openssl for frontend build
RUN apk add --no-cache curl dumb-init openssl

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S app -u 1001

# Set working directory
WORKDIR /app

# Copy and install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source
COPY backend/ ./backend/

# Copy and install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build with proper environment variables
COPY frontend/ ./frontend/

# Build frontend with your specific Coolify domain (HTTP for localhost)
RUN cd frontend && \
    export REACT_APP_API_URL=${REACT_APP_API_URL:-http://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api} && \
    export NODE_ENV=production && \
    export GENERATE_SOURCEMAP=false && \
    echo "Building with API URL: $REACT_APP_API_URL" && \
    REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    REACT_APP_BUILD_HASH=coolify-$(date +%s) \
    npm run build

# Verify the build contains your Coolify domain (simplified)
RUN cd frontend/build && \
    echo "� Checking frontend build..." && \
    ls -la && \
    if [ -f "index.html" ]; then \
        echo "✅ Frontend build successful - index.html found"; \
    else \
        echo "❌ Frontend build failed - index.html missing"; \
        exit 1; \
    fi

# Note: Backend expects frontend build at ../frontend/build relative to backend directory
# Since we're already in /app, the structure /app/frontend/build works correctly

# Change ownership
RUN chown -R app:nodejs /app

# Switch to non-root user
USER app

# Set working directory to backend
WORKDIR /app/backend

# Environment variables for single-worker deployment
ENV NODE_ENV=production
ENV PORT=3002
ENV ENABLE_CLUSTERING=false
ENV MAX_WORKERS=1
ENV SERVE_STATIC=true

# Default API URL - HTTP for localhost Coolify (will be overridden by environment variables)
ENV REACT_APP_API_URL=http://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api

# Redis defaults - will be overridden by Coolify environment variables
ENV REDIS_HOST=attendance-redis
ENV REDIS_PORT=6379

# Note: Database, JWT, and Redis password environment variables will be provided by Coolify
# The environment variables above can be overridden by setting them in Coolify environment variables

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start command with proper process management
CMD ["dumb-init", "node", "server-worker.js"]
