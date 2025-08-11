#!/bin/bash

# Diagnostic script for "No Available Server" issue
# Replace YOUR_DOMAIN with your actual domain

DOMAIN="my.fullship.net"  # Change this to your actual domain

echo "🔍 Diagnosing 'No Available Server' Issue"
echo "=========================================="

echo "1. Testing Health Endpoint..."
curl -v "http://$DOMAIN/health" 2>&1 | head -10

echo -e "\n2. Testing Root (/)..."
curl -v "http://$DOMAIN/" 2>&1 | head -10

echo -e "\n3. Testing API Root..."
curl -v "http://$DOMAIN/api/" 2>&1 | head -10

echo -e "\n4. Testing with different headers..."
curl -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
     -H "User-Agent: Mozilla/5.0" \
     -v "http://$DOMAIN/" 2>&1 | head -10

echo -e "\n5. Testing DNS resolution..."
nslookup $DOMAIN

echo -e "\n🎯 Analysis:"
echo "- If health endpoint works but / doesn't: Frontend serving issue"
echo "- If nothing works: Check Coolify application status"
echo "- If DNS fails: Domain configuration issue"
echo "- If connection refused: Port/firewall issue"
