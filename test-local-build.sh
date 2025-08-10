#!/bin/bash

echo "🔧 Building frontend locally to test environment variable..."
echo ""

cd frontend

# Clean any existing build
rm -rf build/

# Build with the exact same environment variables as Dockerfile
NODE_ENV=production \
GENERATE_SOURCEMAP=false \
REACT_APP_API_URL=https://my.fullship.net/api \
REACT_APP_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ) \
REACT_APP_BUILD_HASH=coolify-$(date +%s) \
npm run build

echo ""
echo "🔍 Checking built files for API URLs..."

# Find the main JS file
MAIN_JS=$(find build/static/js -name "main.*.js" | head -1)
if [ -f "$MAIN_JS" ]; then
    echo "Found main JS file: $MAIN_JS"
    
    echo ""
    echo "Checking for localhost:3002 references:"
    grep -o "localhost:3002" "$MAIN_JS" | wc -l
    
    echo ""
    echo "Checking for my.fullship.net/api references:"
    grep -o "my.fullship.net/api" "$MAIN_JS" | wc -l
    
    echo ""
    echo "Socket.IO connection URL in built file:"
    grep -o "process\.env\.REACT_APP_API_URL[^,}]*" "$MAIN_JS" || echo "Environment variable not found - this is the issue!"
    
else
    echo "No main JS file found in build"
fi

cd ..
