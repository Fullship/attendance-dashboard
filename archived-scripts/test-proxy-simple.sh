#!/bin/bash

echo "🧪 Testing Proxy Configuration"
echo "==============================="

# Start backend in background
echo "🔧 Starting backend..."
cd /Users/salarjirjees/Desktop/myrecipe/attendance-dashboard/attendance-dashboard/backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 10

# Start frontend in background  
echo "🌐 Starting frontend..."
cd /Users/salarjirjees/Desktop/myrecipe/attendance-dashboard/attendance-dashboard/frontend
BROWSER=none npm start &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 30

echo ""
echo "🔍 Testing proxy..."

# Test the proxy
RESULT=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -w "%{http_code}")

STATUS_CODE=$(echo "$RESULT" | tail -c 4)
RESPONSE_BODY=$(echo "$RESULT" | head -c -4)

echo "Status Code: $STATUS_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$STATUS_CODE" = "400" ]; then
    echo "✅ SUCCESS: Proxy is working correctly!"
    echo "   - Frontend is routing requests to backend"
    echo "   - Backend is processing the requests"
    echo "   - 400 status is expected for invalid credentials"
else
    echo "❌ FAILURE: Proxy is not working"
    echo "   - Expected 400 status code for invalid credentials"
    echo "   - Got $STATUS_CODE instead"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
