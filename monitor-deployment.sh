#!/bin/bash

echo "🚀 Monitoring Coolify deployment for CORS fix..."
echo "Started at: $(date)"
echo ""

# Function to check deployment status
check_deployment() {
    echo "📊 Deployment Status Check - $(date)"
    echo "─────────────────────────────────────────"
    
    # Test API endpoint
    echo "1. API Health Check:"
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://my.fullship.net/api/build-info)
    echo "   API Status: $API_STATUS"
    
    # Get main JS filename
    MAIN_JS=$(curl -s https://my.fullship.net | grep -o 'main\.[a-f0-9]*\.js' | head -1)
    if [ ! -z "$MAIN_JS" ]; then
        echo "   Main JS File: $MAIN_JS"
        
        # Check for localhost references
        LOCALHOST_COUNT=$(curl -s "https://my.fullship.net/static/js/$MAIN_JS" | grep -c "localhost:3002" 2>/dev/null || echo "0")
        echo "   Localhost:3002 references: $LOCALHOST_COUNT"
        
        # Check for production API URL
        PROD_URL_COUNT=$(curl -s "https://my.fullship.net/static/js/$MAIN_JS" | grep -c "my.fullship.net/api" 2>/dev/null || echo "0")
        echo "   Production API URL references: $PROD_URL_COUNT"
        
        # Test Socket.IO endpoint
        SOCKET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://my.fullship.net/socket.io/)
        echo "   Socket.IO Status: $SOCKET_STATUS"
        
        # Determine fix status
        if [ "$LOCALHOST_COUNT" = "0" ] && [ "$PROD_URL_COUNT" -gt "0" ]; then
            echo ""
            echo "🎉 SUCCESS! CORS fix has been deployed!"
            echo "   ✅ No localhost:3002 references found"
            echo "   ✅ Production API URL is being used"
            echo "   ✅ Frontend should now connect to the correct API"
            echo ""
            echo "🔧 Next steps:"
            echo "   1. Clear your browser cache or open an incognito window"
            echo "   2. Go to https://my.fullship.net"
            echo "   3. Try logging in - it should work now!"
            return 0
        elif [ "$LOCALHOST_COUNT" -gt "0" ]; then
            echo ""
            echo "⚠️  Deployment still in progress..."
            echo "   Frontend build still contains localhost references"
            echo "   Waiting for Coolify to complete the rebuild..."
            return 1
        else
            echo ""
            echo "❓ Unclear status - checking again..."
            return 1
        fi
    else
        echo "   ❌ Could not find main JS file"
        return 1
    fi
}

# Check immediately
check_deployment
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "Deployment monitoring completed successfully!"
    exit 0
fi

echo ""
echo "🔄 Monitoring deployment progress..."
echo "   Will check every 30 seconds for up to 10 minutes"
echo "   Press Ctrl+C to stop monitoring"
echo ""

# Monitor for up to 10 minutes
for i in {1..20}; do
    sleep 30
    echo ""
    check_deployment
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
        echo "Deployment monitoring completed successfully!"
        exit 0
    fi
    
    REMAINING=$((20 - i))
    echo "   Next check in 30 seconds... ($REMAINING checks remaining)"
done

echo ""
echo "⏰ Monitoring timeout reached (10 minutes)"
echo "   The deployment may still be in progress"
echo "   You can run this script again to continue monitoring"
echo "   Or check https://my.fullship.net manually"
