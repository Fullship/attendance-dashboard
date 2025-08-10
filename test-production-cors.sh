#!/bin/bash

echo "🧪 Testing Production API Endpoints"
echo "==================================="

DOMAIN="https://my.fullship.net"

echo "1. Testing health endpoint..."
curl -s "$DOMAIN/api/health" | head -10
echo ""

echo "2. Testing build info..."
curl -s "$DOMAIN/api/build-info" | head -10
echo ""

echo "3. Testing CORS headers for auth endpoint..."
curl -I -X OPTIONS "$DOMAIN/api/auth/login" \
  -H "Origin: https://my.fullship.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"
echo ""

echo "4. Testing frontend loads correctly..."
curl -s "$DOMAIN/" | grep -q "React" && echo "✅ Frontend HTML contains React" || echo "❌ Frontend HTML issue"

echo ""
echo "🔍 Check browser console at $DOMAIN for any remaining errors"
