#!/bin/bash

echo "🧪 Testing Frontend Serving Fix - $(date)"
echo "==========================================="

BASE_URL="https://my.fullship.net"

echo ""
echo "1️⃣ Testing Root Domain (should serve React app)..."
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/")
HTTP_CODE=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
CONTENT=$(echo $RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$HTTP_CODE" -eq 200 ]; then
    if echo "$CONTENT" | grep -q "<!DOCTYPE html>" || echo "$CONTENT" | grep -q "<html"; then
        echo "✅ SUCCESS: Root domain serving HTML (React app)"
        echo "   Status: $HTTP_CODE"
        echo "   Content type: HTML detected"
    else
        echo "❌ PARTIAL: Got 200 but not HTML content"
        echo "   Status: $HTTP_CODE"
        echo "   Content preview: $(echo $CONTENT | head -c 100)..."
    fi
else
    echo "❌ FAILED: Root domain not serving properly"
    echo "   Status: $HTTP_CODE"
    echo "   Response: $(echo $CONTENT | head -c 200)..."
fi

echo ""
echo "2️⃣ Testing API Routes (should still work)..."
API_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST -H "Content-Type: application/json" "$BASE_URL/api/auth/login" -d '{}')
API_CODE=$(echo $API_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$API_CODE" -eq 400 ] || [ "$API_CODE" -eq 422 ]; then
    echo "✅ SUCCESS: API routes working (validation errors expected)"
    echo "   Status: $API_CODE"
else
    echo "❓ CHECK: API response status $API_CODE"
fi

echo ""
echo "3️⃣ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/health")
HEALTH_CODE=$(echo $HEALTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$HEALTH_CODE" -eq 200 ]; then
    echo "✅ SUCCESS: Health endpoint working"
else
    echo "❌ FAILED: Health endpoint status $HEALTH_CODE"
fi

echo ""
echo "4️⃣ Testing React Router Path..."
ROUTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/dashboard")
ROUTER_CODE=$(echo $ROUTER_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$ROUTER_CODE" -eq 200 ]; then
    echo "✅ SUCCESS: React Router paths working"
    echo "   Status: $ROUTER_CODE (SPA fallback working)"
else
    echo "❓ CHECK: React Router path status $ROUTER_CODE"
fi

echo ""
echo "📋 Summary:"
echo "- Frontend serving should be working after this deployment"
echo "- If root domain still returns JSON, wait a few minutes for Coolify to deploy"
echo "- All API routes should continue working normally"
echo ""
echo "🔄 If still seeing 'Route not found', restart the app in Coolify dashboard"
