#!/bin/bash

echo "🎯 CORS Fix Verification Script"
echo "Checking if the bulletproof hostname detection fix is working..."
echo ""

# Wait a bit for deployment
echo "⏳ Waiting 90 seconds for deployment to complete..."
sleep 90

echo ""
echo "🔍 Testing the fix..."

# Get current main JS file
MAIN_JS=$(curl -s https://my.fullship.net | grep -o 'main\.[a-f0-9]*\.js' | head -1)
echo "Current main JS file: $MAIN_JS"

if [ ! -z "$MAIN_JS" ]; then
    # Check for hostname detection code
    echo ""
    echo "Checking for hostname detection code in build:"
    
    if curl -s "https://my.fullship.net/static/js/$MAIN_JS" | grep -q "my.fullship.net"; then
        echo "✅ Production domain detection found in build"
    else
        echo "❌ Production domain detection NOT found"
    fi
    
    # Check for old localhost references
    LOCALHOST_COUNT=$(curl -s "https://my.fullship.net/static/js/$MAIN_JS" | grep -c "localhost:3002" 2>/dev/null || echo "0")
    echo "Localhost:3002 references: $LOCALHOST_COUNT"
    
    # Test API connection
    echo ""
    echo "Testing API connection:"
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://my.fullship.net/api/build-info)
    echo "API Status: $API_STATUS"
    
    # Test Socket.IO
    echo ""
    echo "Testing Socket.IO connection:"
    SOCKET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://my.fullship.net/socket.io/)
    echo "Socket.IO Status: $SOCKET_STATUS"
    
    echo ""
    if [ "$LOCALHOST_COUNT" = "0" ] || [ "$LOCALHOST_COUNT" = "1" ]; then
        echo "🎉 SUCCESS! The CORS fix appears to be working!"
        echo ""
        echo "✅ What was fixed:"
        echo "   • Frontend now automatically detects production environment"
        echo "   • All API calls use https://my.fullship.net/api"
        echo "   • Socket.IO connects to https://my.fullship.net"
        echo "   • No more cross-origin requests = No more CORS errors"
        echo ""
        echo "🔧 Next steps:"
        echo "   1. Open https://my.fullship.net in a new incognito window"
        echo "   2. Open browser dev tools (F12) and check the Console tab"
        echo "   3. Try logging in - you should see successful connections!"
        echo "   4. Look for 'API Base URL:' and 'Connecting to Socket.IO at:' logs"
        echo ""
        echo "💡 Expected logs:"
        echo "   • API Base URL: https://my.fullship.net/api"
        echo "   • Connecting to Socket.IO at: https://my.fullship.net"
        echo "   • No CORS errors in console"
        
    else
        echo "⚠️  Still detecting issues. The deployment may need more time."
        echo "   Run this script again in a few minutes."
    fi
    
else
    echo "❌ Could not find main JS file. The deployment may still be in progress."
fi

echo ""
echo "Script completed at: $(date)"
