#!/bin/bash

# Test attendance settings API endpoints
echo "Testing attendance settings endpoints..."

# First, login as admin to get token
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful, token obtained"

# Test getting settings
echo "Testing GET /api/admin/settings..."
SETTINGS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/admin/settings)
echo "Settings response: $SETTINGS_RESPONSE" | jq '.' 2>/dev/null || echo "Settings response: $SETTINGS_RESPONSE"

# Test updating a setting
echo ""
echo "Testing PUT /api/admin/settings/late_threshold_minutes..."
UPDATE_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "20"}' \
  http://localhost:3002/api/admin/settings/late_threshold_minutes)
echo "Update response: $UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "Update response: $UPDATE_RESPONSE"

# Test adding a holiday
echo ""
echo "Testing POST /api/admin/holidays..."
HOLIDAY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Holiday", "date": "2025-12-31", "isRecurring": false, "description": "Test holiday for API"}' \
  http://localhost:3002/api/admin/holidays)
echo "Holiday response: $HOLIDAY_RESPONSE" | jq '.' 2>/dev/null || echo "Holiday response: $HOLIDAY_RESPONSE"

echo ""
echo "✅ Settings API testing completed!"
