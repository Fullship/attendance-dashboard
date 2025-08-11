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

# Build frontend with your specific Coolify domain
RUN cd frontend && \
    export REACT_APP_API_URL=${REACT_APP_API_URL:-https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api} && \
    export NODE_ENV=production && \
    export GENERATE_SOURCEMAP=false && \
    echo "Building with API URL: $REACT_APP_API_URL" && \
    REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    REACT_APP_BUILD_HASH=coolify-$(date +%s) \
    npm run build

# Verify the build and frontend structure
RUN echo "🔍 Verifying frontend build..." && \
    ls -la frontend/build/ && \
    echo "📁 Frontend build contents:" && \
    find frontend/build -name "*.html" -o -name "*.css" -o -name "*.js" | head -10 && \
    if [ -f "frontend/build/index.html" ]; then \
        echo "✅ index.html found"; \
    else \
        echo "❌ index.html NOT found - frontend will not work"; \
        exit 1; \
    fi && \
    if [ -d "frontend/build/static" ]; then \
        echo "✅ static directory found"; \
    else \
        echo "❌ static directory NOT found"; \
        exit 1; \
    fi

# Verify the build contains your Coolify domain
RUN cd frontend/build/static/js && \
    MAIN_JS=$(ls main.*.js | head -1) && \
    echo "Checking built main JS file: $MAIN_JS" && \
    API_URL=${REACT_APP_API_URL:-https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api} && \
    if grep -q "wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io" "$MAIN_JS"; then \
        echo "✅ Coolify domain found in build: $API_URL"; \
    else \
        echo "⚠️  Coolify domain NOT found in build, check environment variables"; \
        echo "Built file contains:"; \
        head -c 500 "$MAIN_JS"; \
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

# Default API URL - will be overridden by Coolify environment variables
ENV REACT_APP_API_URL=https://wswwkwgk48os8gwo48owg8gk.45.136.18.66.sslip.io/api

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
