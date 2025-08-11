#!/bin/bash

# Test script for production deployment
# Replace with your actual domain

DOMAIN="my.fullship.net"  # Change this to your actual domain

echo "🧪 Testing Production Deployment URLs"
echo "====================================="

echo "1. Testing Health Endpoint..."
curl -s "http://$DOMAIN/health" | head -5

echo -e "\n2. Testing Frontend Root..."
curl -s -I "http://$DOMAIN/" | head -5

echo -e "\n3. Testing API Root..."
curl -s "http://$DOMAIN/api/" | head -5

echo -e "\n4. Testing Static Files..."
curl -s -I "http://$DOMAIN/static/css/main.css" | head -3

echo -e "\n5. Testing Frontend Index..."
curl -s "http://$DOMAIN/index.html" | head -3

echo -e "\n🎯 If all tests show proper responses, deployment is working!"
