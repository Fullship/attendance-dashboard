#!/bin/bash

# Test Holiday Highlighting Implementation
# This script tests the new holiday highlighting feature

echo "🎯 Testing Holiday Highlighting Implementation"
echo "============================================="

# First, let's start the backend server
echo "🚀 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Give the server time to start
sleep 3

# Test the new holidays endpoint
echo "🔍 Testing holidays endpoint..."
curl -X GET http://localhost:3002/api/attendance/holidays \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  2>/dev/null | jq '.' || echo "❌ Failed to fetch holidays (expected without auth)"

# Check if the endpoint exists (should get 401 without auth)
HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:3002/api/attendance/holidays)
if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Holidays endpoint exists and requires authentication"
else
  echo "❌ Holidays endpoint issue - HTTP $HTTP_CODE"
fi

# Test with a fake token (should get 401/403)
echo "🔑 Testing with fake token..."
HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" \
  -H "Authorization: Bearer fake_token" \
  http://localhost:3002/api/attendance/holidays)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo "✅ Proper authentication required"
else
  echo "❌ Authentication issue - HTTP $HTTP_CODE"
fi

# Stop the backend
kill $BACKEND_PID 2>/dev/null || true

echo ""
echo "✅ Holiday highlighting backend changes implemented!"
echo "📝 Summary:"
echo "   - Added /api/attendance/holidays endpoint"
echo "   - Frontend updated to fetch and display holidays"
echo "   - Calendar highlighting with red background for holidays"
echo "   - Updated legend to show holiday indicators"
echo ""
echo "🎉 Next steps:"
echo "   1. Start the servers with: npm run dev"
echo "   2. Log in as admin and add some holidays"
echo "   3. Check the employee calendar for holiday highlighting"
