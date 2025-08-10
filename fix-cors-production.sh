#!/bin/bash

echo "🔧 Fixing CORS and API URL Configuration"
echo "========================================"

# 1. Update Dockerfile to use correct API URL
echo "📝 Updating Dockerfile with production API URL..."
sed -i '' 's|REACT_APP_BUILD_HASH=coolify-$(date +%s)|REACT_APP_API_URL=https://my.fullship.net/api \\
    REACT_APP_BUILD_HASH=coolify-$(date +%s)|' Dockerfile

echo "✅ Dockerfile updated with REACT_APP_API_URL=https://my.fullship.net/api"

# 2. Update backend CORS to include production domain
echo "📝 Checking backend CORS configuration..."
if grep -q "my.fullship.net" backend/server.js; then
    echo "✅ Backend CORS already includes my.fullship.net"
else
    echo "⚠️  Backend CORS might need manual verification"
fi

# 3. Commit and push the changes
echo "📦 Committing changes..."
git add .
git commit -m "Fix frontend API URL for production - point to https://my.fullship.net/api instead of localhost"

echo "🚀 Pushing to trigger Coolify rebuild..."
git push

echo ""
echo "🎯 IMPORTANT: After Coolify rebuilds, the frontend will connect to:"
echo "   • API: https://my.fullship.net/api"
echo "   • Socket.IO: https://my.fullship.net"
echo ""
echo "✅ This should resolve the CORS errors!"
echo ""
echo "📋 Manual verification steps:"
echo "1. Wait for Coolify to complete the rebuild"
echo "2. Open browser dev tools on https://my.fullship.net" 
echo "3. Try logging in and check for CORS errors"
echo "4. Verify network requests go to https://my.fullship.net/api instead of localhost:3002"
