#!/bin/bash

# Route Testing Script
# Tests all major API endpoints to verify which routes are working

echo "🧪 Testing API Routes - $(date)"
echo "=================================="

BASE_URL="http://my.fullship.net"

echo ""
echo "1️⃣ Testing Health Check (no auth required)..."
curl -s -o /dev/null -w "Status: %{http_code}" "$BASE_URL/health" && echo " - ✅ Health check endpoint"

echo ""
echo "2️⃣ Testing API Health Check..."
curl -s -o /dev/null -w "Status: %{http_code}" "$BASE_URL/api/monitoring/health" && echo " - API monitoring health"

echo ""
echo "3️⃣ Testing Protected Routes (should return 401 or proper error)..."

# Auth routes
echo "Auth check:"
curl -s -w "Status: %{http_code}" "$BASE_URL/api/auth/check" | head -1

echo ""
echo "User profile:"
curl -s -w "Status: %{http_code}" "$BASE_URL/api/users/profile" | head -1

echo ""
echo "Attendance records:"
curl -s -w "Status: %{http_code}" "$BASE_URL/api/attendance/records" | head -1

echo ""
echo "4️⃣ Testing Non-existent Route (should return 404)..."
curl -s -w "Status: %{http_code}" "$BASE_URL/api/nonexistent" | head -1

echo ""
echo "5️⃣ Testing Login Endpoint (POST)..."
curl -s -X POST -H "Content-Type: application/json" -w "Status: %{http_code}" "$BASE_URL/api/auth/login" -d '{}' | head -1

echo ""
echo "6️⃣ Full Response from Non-existent Route:"
echo "----------------------------------------"
curl -s "$BASE_URL/api/test-route-404" | jq . 2>/dev/null || curl -s "$BASE_URL/api/test-route-404"

echo ""
echo ""
echo "📋 Route Test Summary:"
echo "- 200: Route exists and working"
echo "- 401: Route exists but requires authentication"
echo "- 404: Route not found"
echo "- 500: Server error"
echo ""
echo "✅ If you see 'Route not found' with worker info, the backend is working but route doesn't exist"
echo "❌ If you see connection errors, the backend isn't running properly"
