#!/bin/bash

echo "🔍 Validating Dockerfile requirements..."

# Check if required directories exist
echo "Checking directories:"
if [ -d "frontend" ]; then
    echo "✅ frontend/ directory exists"
else
    echo "❌ frontend/ directory missing"
    exit 1
fi

if [ -d "backend" ]; then
    echo "✅ backend/ directory exists"
else
    echo "❌ backend/ directory missing"
    exit 1
fi

# Check if package.json files exist
echo -e "\nChecking package.json files:"
if [ -f "frontend/package.json" ]; then
    echo "✅ frontend/package.json exists"
else
    echo "❌ frontend/package.json missing"
    exit 1
fi

if [ -f "backend/package.json" ]; then
    echo "✅ backend/package.json exists"
else
    echo "❌ backend/package.json missing"
    exit 1
fi

# Check if server-worker.js exists
echo -e "\nChecking backend entry point:"
if [ -f "backend/server-worker.js" ]; then
    echo "✅ backend/server-worker.js exists"
else
    echo "❌ backend/server-worker.js missing"
    exit 1
fi

# Check if react-app-rewired is in frontend dependencies
echo -e "\nChecking frontend build dependencies:"
if grep -q "react-app-rewired" frontend/package.json; then
    echo "✅ react-app-rewired found in frontend dependencies"
else
    echo "❌ react-app-rewired not found in frontend dependencies"
    exit 1
fi

# Check Dockerfile
echo -e "\nChecking Dockerfile:"
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile exists"
    
    # Check for required commands
    if grep -q "FROM node:18-alpine" Dockerfile; then
        echo "✅ Base image specified correctly"
    else
        echo "❌ Base image not found or incorrect"
    fi
    
    if grep -q "openssl" Dockerfile; then
        echo "✅ OpenSSL dependency included"
    else
        echo "❌ OpenSSL dependency missing"
    fi
    
    if grep -q "SERVE_STATIC=true" Dockerfile; then
        echo "✅ SERVE_STATIC environment variable set"
    else
        echo "❌ SERVE_STATIC environment variable missing"
    fi
else
    echo "❌ Dockerfile missing"
    exit 1
fi

# Check .dockerignore
echo -e "\nChecking .dockerignore:"
if [ -f ".dockerignore" ]; then
    echo "✅ .dockerignore exists"
    
    # Check that it doesn't ignore frontend/backend
    if grep -q "^frontend$" .dockerignore || grep -q "^backend$" .dockerignore; then
        echo "⚠️  WARNING: .dockerignore may be excluding frontend or backend directories"
    else
        echo "✅ frontend and backend directories not excluded"
    fi
else
    echo "⚠️  .dockerignore missing (optional but recommended)"
fi

echo -e "\n🎉 Dockerfile validation complete!"
echo "Your Dockerfile should now build successfully on Coolify."
echo ""
echo "Next steps for Coolify deployment:"
echo "1. Commit and push these changes to your Git repository"
echo "2. In Coolify, trigger a new deployment"
echo "3. Make sure your Redis environment variables are set in Coolify:"
echo "   - REDIS_HOST=your-redis-host"
echo "   - REDIS_PORT=6379"
echo "   - REDIS_PASSWORD=your-redis-password"
echo "4. Set the deployment port to 3002 in Coolify settings"
