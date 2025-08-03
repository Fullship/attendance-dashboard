#!/bin/bash

# Test Work Schedule Management Specifically
echo "🕐 Testing Work Schedule Management"
echo "==================================="

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

# Get current work schedules
echo ""
echo "2. Getting current work schedules..."
CURRENT_SCHEDULES=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3002/api/admin/settings)
SCHEDULES_COUNT=$(echo $CURRENT_SCHEDULES | jq '.workSchedules | length' 2>/dev/null || echo "0")
echo "   📅 Found $SCHEDULES_COUNT existing work schedules"

# List current schedules
echo ""
echo "Current work schedules:"
echo $CURRENT_SCHEDULES | jq '.workSchedules[] | {id: .id, name: .name, start_time: .start_time, end_time: .end_time, days_of_week: .days_of_week, is_default: .is_default}' 2>/dev/null || echo "Could not parse schedules"

# Test creating a new work schedule
echo ""
echo "3. Creating new work schedule..."
NEW_SCHEDULE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Evening Shift", 
    "startTime": "18:00:00", 
    "endTime": "02:00:00", 
    "daysOfWeek": [1,2,3,4,5], 
    "isDefault": false
  }' \
  http://localhost:3002/api/admin/work-schedules)

if echo $NEW_SCHEDULE | grep -q "added successfully"; then
  echo "✅ Work schedule creation successful"
  SCHEDULE_ID=$(echo $NEW_SCHEDULE | jq '.schedule.id' 2>/dev/null)
  echo "   📅 Created schedule with ID: $SCHEDULE_ID"
else
  echo "❌ Work schedule creation failed"
  echo "Response: $NEW_SCHEDULE"
fi

# Test updating the schedule
if [ -n "$SCHEDULE_ID" ] && [ "$SCHEDULE_ID" != "null" ]; then
  echo ""
  echo "4. Testing schedule update..."
  UPDATE_RESULT=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Updated Evening Shift", 
      "startTime": "19:00:00", 
      "endTime": "03:00:00", 
      "daysOfWeek": [1,2,3,4], 
      "isDefault": false
    }' \
    http://localhost:3002/api/admin/work-schedules/$SCHEDULE_ID)

  if echo $UPDATE_RESULT | grep -q "updated successfully"; then
    echo "✅ Work schedule update successful"
  else
    echo "❌ Work schedule update failed"
    echo "Response: $UPDATE_RESULT"
  fi

  # Test deleting the schedule
  echo ""
  echo "5. Testing schedule deletion..."
  DELETE_RESULT=$(curl -s -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3002/api/admin/work-schedules/$SCHEDULE_ID)

  if echo $DELETE_RESULT | grep -q "deleted successfully"; then
    echo "✅ Work schedule deletion successful"
  else
    echo "❌ Work schedule deletion failed"
    echo "Response: $DELETE_RESULT"
  fi
fi

# Test attempting to delete default schedule (should fail)
echo ""
echo "6. Testing default schedule protection..."
DEFAULT_SCHEDULE_ID=$(echo $CURRENT_SCHEDULES | jq '.workSchedules[] | select(.is_default == true) | .id' 2>/dev/null | head -1)

if [ -n "$DEFAULT_SCHEDULE_ID" ] && [ "$DEFAULT_SCHEDULE_ID" != "null" ]; then
  DELETE_DEFAULT_RESULT=$(curl -s -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3002/api/admin/work-schedules/$DEFAULT_SCHEDULE_ID)

  if echo $DELETE_DEFAULT_RESULT | grep -q "Cannot delete"; then
    echo "✅ Default schedule protection working"
  else
    echo "❌ Default schedule protection failed"
    echo "Response: $DELETE_DEFAULT_RESULT"
  fi
else
  echo "⚠️  No default schedule found to test protection"
fi

echo ""
echo "🎉 Work Schedule Testing Complete!"
echo ""
echo "📋 Work Schedule Form Features:"
echo "   📝 Schedule Name: Descriptive name for the schedule"
echo "   🕐 Start/End Time: Work hours in HH:MM format"
echo "   📅 Working Days: Select multiple days (Mon-Sun)"
echo "   ⭐ Default Setting: Mark as default for new employees"
echo "   ✏️  Edit Function: Modify existing schedules"
echo "   🗑️  Delete Function: Remove non-default schedules"
echo "   🛡️  Protection: Cannot delete default schedule"
echo ""
echo "Access the frontend at: http://localhost:3000/admin -> Settings tab"
