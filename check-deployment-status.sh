#!/bin/bash

echo "🔍 Checking deployment status..."
echo ""

# Check if the frontend is using the correct API URL
echo "Testing current frontend build for API URL configuration:"
echo "Looking for localhost:3002 (old) vs my.fullship.net/api (new)"
echo ""

# Test the build-info endpoint
echo "1. Testing API endpoint directly:"
curl -s -o /dev/null -w "HTTP Status: %{http_code} | Response Time: %{time_total}s" https://my.fullship.net/api/build-info
echo ""
echo ""

# Check frontend source for the API URL
echo "2. Checking if frontend build contains correct API URL:"
echo "Downloading main JS file to check for hardcoded URLs..."

# Get the main JS file URL from the index.html
MAIN_JS=$(curl -s https://my.fullship.net | grep -oP 'main\.[a-f0-9]+\.js' | head -1)
if [ ! -z "$MAIN_JS" ]; then
    echo "Found main JS file: $MAIN_JS"
    
    # Download and check for localhost
    echo "Checking for localhost:3002 references:"
    curl -s "https://my.fullship.net/$MAIN_JS" | grep -o "localhost:3002" | head -5
    
    echo ""
    echo "Checking for correct production API URL:"
    curl -s "https://my.fullship.net/$MAIN_JS" | grep -o "my\.fullship\.net/api" | head -5
    
else
    echo "Could not find main JS file in index.html"
fi

echo ""
echo "3. Testing Socket.IO connection (should fail until fixed):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}" https://my.fullship.net/socket.io/
echo ""

echo ""
echo "🎯 If you see 'localhost:3002' in the JS file, the deployment hasn't updated yet."
echo "   Wait a few minutes and run this script again."
echo ""
echo "✅ If you see 'my.fullship.net/api' and no localhost references, the fix is deployed!"
