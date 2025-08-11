#!/bin/bash

echo "🔍 Finding Your Working Application URL"
echo "======================================"

echo "Testing common localhost URLs..."

echo -e "\n1. Testing localhost:3002..."
curl -s -I "http://localhost:3002/health" 2>/dev/null | head -3

echo -e "\n2. Testing 127.0.0.1:3002..."
curl -s -I "http://127.0.0.1:3002/health" 2>/dev/null | head -3

echo -e "\n3. Testing host.docker.internal:3002..."
curl -s -I "http://host.docker.internal:3002/health" 2>/dev/null | head -3

echo -e "\n4. Testing my.fullship.net with port..."
curl -s -I "http://my.fullship.net:3002/health" 2>/dev/null | head -3

echo -e "\n5. Testing my.fullship.net without port..."
curl -s -I "http://my.fullship.net/health" 2>/dev/null | head -3

echo -e "\n🎯 Check which URL returns 'HTTP/1.1 200 OK' or similar"
echo "That's your working application URL!"
