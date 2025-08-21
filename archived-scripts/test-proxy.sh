#!/bin/bash

echo "🧪 Testing Proxy Configuration..."
echo "================================="

# Wait for servers to be ready
echo "⏳ Waiting for servers to start..."
sleep 5

echo ""
echo "🔍 Testing Backend Direct Access..."
BACKEND_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -w "\n%{http_code}")

BACKEND_CODE=$(echo "$BACKEND_RESPONSE" | tail -n1)
BACKEND_BODY=$(echo "$BACKEND_RESPONSE" | head -n -1)

echo "Backend Response Code: $BACKEND_CODE"
echo "Backend Response Body: $BACKEND_BODY"

echo ""
echo "🔍 Testing Frontend Proxy..."
PROXY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -w "\n%{http_code}")

PROXY_CODE=$(echo "$PROXY_RESPONSE" | tail -n1)
PROXY_BODY=$(echo "$PROXY_RESPONSE" | head -n -1)

echo "Proxy Response Code: $PROXY_CODE"
echo "Proxy Response Body: $PROXY_BODY"

echo ""
echo "📊 Test Results:"
echo "================"

if [ "$BACKEND_CODE" = "400" ] && [ "$PROXY_CODE" = "400" ]; then
    echo "✅ SUCCESS: Both backend and proxy return expected 400 (Invalid credentials)"
    echo "✅ Proxy is working correctly!"
elif [ "$BACKEND_CODE" = "400" ] && [ "$PROXY_CODE" = "404" ]; then
    echo "❌ FAILURE: Backend works (400) but proxy returns 404"
    echo "❌ Proxy routing is broken"
elif [ "$PROXY_CODE" = "000" ]; then
    echo "❌ FAILURE: Cannot connect to frontend server"
    echo "❌ Frontend server may not be running"
else
    echo "⚠️  UNKNOWN: Unexpected response codes"
    echo "   Backend: $BACKEND_CODE, Proxy: $PROXY_CODE"
fi

echo ""
echo "🏁 Test Complete"
