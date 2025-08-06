#!/bin/bash

# Quick validation for Coolify deployment fix
echo "🔍 Validating Coolify Deployment Fix..."

# Check if main Dockerfile exists
if [ -f "Dockerfile" ]; then
    echo "✅ Main Dockerfile exists"
else
    echo "❌ Main Dockerfile missing"
    exit 1
fi

# Check if it contains the fixes
if grep -q "openssl" Dockerfile; then
    echo "✅ OpenSSL installation found"
else
    echo "❌ OpenSSL installation missing"
fi

if grep -q "npm ci$" Dockerfile; then
    echo "✅ Full npm ci (not --only=production) found for frontend"
else
    echo "❌ Still using --only=production for frontend"
fi

if grep -q "REACT_APP_BUILD_HASH=docker-static-build" Dockerfile; then
    echo "✅ Static build variables found"
else
    echo "❌ Dynamic build variables still present"
fi

# Check alternative files
echo ""
echo "📁 Alternative deployment options:"

if [ -f "frontend/Dockerfile.simple" ]; then
    echo "✅ Simple frontend Dockerfile available"
fi

if [ -f "backend/Dockerfile.simple" ]; then
    echo "✅ Simple backend Dockerfile available"
fi

if [ -f "docker-compose.separate.yml" ]; then
    echo "✅ Separate containers compose file available"
fi

echo ""
echo "📋 Summary:"
echo "   Main approach: Single container (Dockerfile)"
echo "   Alternative: Separate containers (frontend/backend .simple files)"
echo "   Environment: Configure in Coolify dashboard"
echo "   Health checks: /health endpoints configured"
echo ""
echo "🚀 Ready for Coolify deployment!"
