#!/bin/bash

# Test proxy with simple backend (no Redis)
echo "🧪 Testing proxy with simple backend..."

# Kill any existing processes
pkill -f "test-simple-backend.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null
sleep 2

# Start simple backend (no Redis dependency)
echo "🚀 Starting simple backend on port 3002..."
cd /Users/salarjirjees/Desktop/myrecipe/attendance-dashboard/attendance-dashboard
node test-simple-backend.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Test backend directly
echo "🔍 Testing backend directly..."
BACKEND_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/backend_test.json -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}')
echo "Backend direct test: HTTP $BACKEND_RESPONSE"
cat /tmp/backend_test.json
echo ""

# Start frontend
echo "🚀 Starting frontend on port 3001..."
cd frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend to compile (up to 60 seconds)
echo "⏳ Waiting for frontend to compile..."
for i in {1..60}; do
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend ready after ${i} seconds"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ Frontend startup timeout"
    exit 1
  fi
  sleep 1
done

# Test proxy routing
echo "🔍 Testing proxy routing..."
sleep 2

PROXY_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/proxy_test.json -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}')

echo "Proxy test result: HTTP $PROXY_RESPONSE"
cat /tmp/proxy_test.json
echo ""

# Test with valid credentials
echo "🔍 Testing with valid credentials..."
VALID_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/valid_test.json -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}')

echo "Valid credentials test: HTTP $VALID_RESPONSE"
cat /tmp/valid_test.json
echo ""

# Show results
echo ""
echo "📊 Test Results:"
echo "  Backend Direct: HTTP $BACKEND_RESPONSE"
echo "  Proxy Invalid:  HTTP $PROXY_RESPONSE"
echo "  Proxy Valid:    HTTP $VALID_RESPONSE"

if [ "$PROXY_RESPONSE" = "400" ] && [ "$VALID_RESPONSE" = "200" ]; then
  echo "✅ SUCCESS: Proxy is working correctly!"
else
  echo "❌ FAILURE: Proxy routing issue detected"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
sleep 2
pkill -f "test-simple-backend.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

echo "✅ Test complete"
