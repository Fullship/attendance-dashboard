# PRODUCTION DOCKERFILE FOR COOLIFY DEPLOYMENT
# Multi-stage build optimized for my.fullship.net domain
# Date: 2025-08-11

# ========================================
# Stage 1: Build Frontend
# ========================================
FROM node:18-alpine AS frontend-builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production && npm ci --only=development

# Copy frontend source
COPY frontend/ ./

# Build frontend with production environment
ARG REACT_APP_API_URL=http://my.fullship.net/api
ARG NODE_ENV=production
ARG GENERATE_SOURCEMAP=false

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV NODE_ENV=${NODE_ENV}
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}

# Build the React application
RUN echo "Building frontend with API URL: $REACT_APP_API_URL" && \
    npm run build

# Verify build output
RUN ls -la build/ && \
    if [ ! -f "build/index.html" ]; then \
        echo "❌ Frontend build failed - index.html missing"; \
        exit 1; \
    else \
        echo "✅ Frontend build successful"; \
    fi

# ========================================
# Stage 2: Prepare Backend
# ========================================
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# ========================================
# Stage 3: Production Runtime
# ========================================
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    tini \
    ca-certificates

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy backend code and dependencies from builder
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create logs directory
RUN mkdir -p /app/backend/logs && \
    chown -R app:nodejs /app

# Switch to non-root user
USER app

# Set working directory to backend
WORKDIR /app/backend

# ========================================
# Environment Configuration
# ========================================

# Application settings
ENV NODE_ENV=production
ENV PORT=3002

# Performance settings
ENV ENABLE_CLUSTERING=false
ENV MAX_WORKERS=1
ENV SERVE_STATIC=true

# Frontend serving
ENV REACT_APP_API_URL=http://my.fullship.net/api

# Database configuration (will be overridden by Coolify)
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=attendance_dashboard
ENV DB_USER=attendance_user

# Redis configuration (will be overridden by Coolify)
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# Security - These MUST be set via environment variables in Coolify
# ENV SESSION_SECRET will be provided by Coolify environment variables
# ENV JWT_SECRET will be provided by Coolify environment variables

# ========================================
# Service Configuration
# ========================================

# Expose the application port
EXPOSE 3002

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start the application with proper process management
ENTRYPOINT ["tini", "--"]
CMD ["dumb-init", "node", "server-worker.js"]