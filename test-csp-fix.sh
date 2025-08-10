#!/bin/bash

echo "🔧 Testing CSP Fix for React Blank Page - $(date)"
echo "================================================"

BASE_URL="https://my.fullship.net"

echo ""
echo "1️⃣ Checking Content Security Policy headers..."
CSP_HEADER=$(curl -s -I "$BASE_URL/" | grep -i "content-security-policy")
echo "Current CSP: $CSP_HEADER"

if echo "$CSP_HEADER" | grep -q "script-src.*'unsafe-inline'"; then
    echo "✅ SUCCESS: CSP allows inline scripts"
else
    echo "❌ ISSUE: CSP still blocking inline scripts"
fi

echo ""
echo "2️⃣ Testing if React app loads (checking for blank page)..."
RESPONSE=$(curl -s "$BASE_URL/")
if echo "$RESPONSE" | grep -q "webpack"; then
    echo "✅ SUCCESS: Webpack runtime script detected in HTML"
else
    echo "❓ INFO: No webpack runtime detected"
fi

echo ""
echo "3️⃣ Testing static assets are accessible..."
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/js/main.ef0a4201.js")
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/css/main.b7fa5101.css")

echo "JavaScript file status: $JS_STATUS"
echo "CSS file status: $CSS_STATUS"

if [ "$JS_STATUS" -eq 200 ] && [ "$CSS_STATUS" -eq 200 ]; then
    echo "✅ SUCCESS: Static assets loading correctly"
else
    echo "❌ ISSUE: Some static assets not loading"
fi

echo ""
echo "4️⃣ Testing API functionality (should still work)..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" "$BASE_URL/api/auth/login" -d '{}')
if [ "$API_STATUS" -eq 400 ] || [ "$API_STATUS" -eq 422 ]; then
    echo "✅ SUCCESS: API still functioning (status: $API_STATUS)"
else
    echo "❓ CHECK: API status $API_STATUS"
fi

echo ""
echo "📋 Expected Results After Fix:"
echo "- CSP should include 'unsafe-inline' for script-src"
echo "- React app should display content instead of blank page"
echo "- Browser console should not show CSP violations"
echo "- All API endpoints should continue working"
echo ""
echo "🌐 Visit https://my.fullship.net/ in browser to verify React app loads"
