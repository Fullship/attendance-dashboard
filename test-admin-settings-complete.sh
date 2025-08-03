#!/bin/bash

# Test the complete admin settings functionality
echo "🔧 Testing Admin Settings Functionality"
echo "========================================"

# Login as admin
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  exit 1
fi
echo "✅ Login successful"

# Test getting all settings
echo ""
echo "2. Testing GET settings endpoint..."
SETTINGS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/admin/settings)
SETTINGS_COUNT=$(echo $SETTINGS | jq '.settings | length' 2>/dev/null || echo "0")
HOLIDAYS_COUNT=$(echo $SETTINGS | jq '.holidays | length' 2>/dev/null || echo "0")
SCHEDULES_COUNT=$(echo $SETTINGS | jq '.workSchedules | length' 2>/dev/null || echo "0")

echo "   📊 Found $SETTINGS_COUNT settings"
echo "   🎄 Found $HOLIDAYS_COUNT holidays"
echo "   📅 Found $SCHEDULES_COUNT work schedules"

if [ "$SETTINGS_COUNT" -gt "0" ]; then
  echo "✅ Settings endpoint working"
else
  echo "❌ No settings found"
fi

# Test updating a specific setting
echo ""
echo "3. Testing setting update..."
UPDATE_RESULT=$(curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "10"}' \
  http://localhost:3002/api/admin/settings/grace_period_minutes)

if echo $UPDATE_RESULT | grep -q "updated successfully"; then
  echo "✅ Setting update successful"
else
  echo "❌ Setting update failed"
  echo "Response: $UPDATE_RESULT"
fi

# Test adding a new holiday
echo ""
echo "4. Testing holiday management..."
HOLIDAY_NAME="Company Picnic $(date +%s)"
HOLIDAY_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$HOLIDAY_NAME\", \"date\": \"2025-08-15\", \"isRecurring\": false, \"description\": \"Annual company picnic\"}" \
  http://localhost:3002/api/admin/holidays)

if echo $HOLIDAY_RESULT | grep -q "added successfully"; then
  echo "✅ Holiday creation successful"
  HOLIDAY_ID=$(echo $HOLIDAY_RESULT | jq '.holiday.id' 2>/dev/null)
  echo "   📅 Created holiday with ID: $HOLIDAY_ID"
else
  echo "❌ Holiday creation failed"
  echo "Response: $HOLIDAY_RESULT"
fi

# Test deleting the holiday
if [ -n "$HOLIDAY_ID" ] && [ "$HOLIDAY_ID" != "null" ]; then
  echo ""
  echo "5. Testing holiday deletion..."
  DELETE_RESULT=$(curl -s -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3002/api/admin/holidays/$HOLIDAY_ID)

  if echo $DELETE_RESULT | grep -q "deleted successfully"; then
    echo "✅ Holiday deletion successful"
  else
    echo "❌ Holiday deletion failed"
    echo "Response: $DELETE_RESULT"
  fi
fi

# Test adding work schedule
echo ""
echo "6. Testing work schedule management..."
SCHEDULE_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Part-time Schedule", "startTime": "10:00:00", "endTime": "14:00:00", "daysOfWeek": [1,2,3], "isDefault": false}' \
  http://localhost:3002/api/admin/work-schedules)

if echo $SCHEDULE_RESULT | grep -q "added successfully"; then
  echo "✅ Work schedule creation successful"
else
  echo "❌ Work schedule creation failed"
  echo "Response: $SCHEDULE_RESULT"
fi

echo ""
echo "🎉 Admin Settings Testing Complete!"
echo ""
echo "📋 Summary of Available Settings Categories:"
echo "   🕐 Time & Schedule: Late thresholds, grace periods, work hours"
echo "   ⏰ Overtime & Hours: Overtime rules and weekend work policies"
echo "   💰 Pay & Benefits: Pay multipliers for overtime and holidays"
echo "   📝 Employee Requests: Retroactive request policies"
echo "   🎄 Holidays: Company holidays that don't count as absent"
echo "   📅 Work Schedules: Standard work hours and days"
echo ""
echo "Access the admin panel at: http://localhost:3000/admin"
echo "Navigate to the 'Settings' tab to manage these configurations."
