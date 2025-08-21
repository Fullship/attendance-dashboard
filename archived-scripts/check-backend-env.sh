#!/bin/bash

# BACKEND ENVIRONMENT VARIABLES CHECKER
# This script helps diagnose backend 500 errors by checking required environment variables

echo "🔍 Backend Environment Variables Diagnostic"
echo "=============================================="

echo ""
echo "📋 Required Environment Variables:"
echo ""

# Core Application
echo "🏢 Application Configuration:"
echo "NODE_ENV: ${NODE_ENV:-❌ NOT SET}"
echo "PORT: ${PORT:-❌ NOT SET (default: 3002)}"
echo "JWT_SECRET: ${JWT_SECRET:+✅ SET}${JWT_SECRET:-❌ NOT SET}"
echo ""

# Database Configuration
echo "🗄️ Database Configuration:"
echo "DB_HOST: ${DB_HOST:-❌ NOT SET}"
echo "DB_PORT: ${DB_PORT:-❌ NOT SET}"
echo "DB_NAME: ${DB_NAME:-❌ NOT SET}"
echo "DB_USER: ${DB_USER:-❌ NOT SET}"
echo "DB_PASSWORD: ${DB_PASSWORD:+✅ SET}${DB_PASSWORD:-❌ NOT SET}"
echo "DB_SSL: ${DB_SSL:-❌ NOT SET (default: false)}"
echo ""

# Frontend Configuration  
echo "🌐 Frontend Configuration:"
echo "FRONTEND_URL: ${FRONTEND_URL:-❌ NOT SET}"
echo "REACT_APP_API_URL: ${REACT_APP_API_URL:-❌ NOT SET}"
echo ""

# Redis Configuration
echo "🔴 Redis Configuration:"
echo "REDIS_HOST: ${REDIS_HOST:-❌ NOT SET}"
echo "REDIS_PORT: ${REDIS_PORT:-❌ NOT SET}"
echo ""

# Email Configuration (Optional)
echo "📧 Email Configuration (Optional):"
echo "EMAIL_HOST: ${EMAIL_HOST:-❌ NOT SET}"
echo "EMAIL_PORT: ${EMAIL_PORT:-❌ NOT SET}"
echo "EMAIL_USER: ${EMAIL_USER:-❌ NOT SET}"
echo "EMAIL_PASS: ${EMAIL_PASS:+✅ SET}${EMAIL_PASS:-❌ NOT SET}"
echo ""

echo "=============================================="
echo ""
echo "🚨 CRITICAL VARIABLES FOR LOGIN TO WORK:"
echo "   - JWT_SECRET (for token generation)"
echo "   - All DB_* variables (for database connection)"
echo "   - FRONTEND_URL (for CORS)"
echo ""
echo "💡 If any critical variables show '❌ NOT SET', update them in Coolify!"
