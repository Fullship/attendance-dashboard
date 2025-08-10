# COOLIFY FIXED DOCKERFILE - NO MULTI-STAGE BUILD
# Date: 2025-08-07
# Single-stage build for Coolify deployment
FROM node:18-alpine

# Build argument to prevent caching issues
ARG CACHEBUST=20250807
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

# Set build arguments and environment variables for React build
ARG REACT_APP_API_URL=https://my.fullship.net/api
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Build frontend with environment variables
RUN cd frontend && \
    REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
    REACT_APP_BUILD_HASH=coolify-$(date +%s) \
    npm run build

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

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start command with proper process management
CMD ["dumb-init", "node", "server-worker.js"]
