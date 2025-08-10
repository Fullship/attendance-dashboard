#!/bin/bash

# Quick Fix Script for Bad Gateway Error
# Run this on your server to attempt automatic fixes

echo "🚑 Bad Gateway Quick Fix Script - $(date)"
echo "==========================================="

# Change to deployment directory
cd /path/to/your/attendance-dashboard

echo ""
echo "1️⃣ Stopping all services..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "2️⃣ Cleaning up Docker resources..."
docker system prune -f

echo ""
echo "3️⃣ Starting services with fresh containers..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "4️⃣ Waiting for services to start..."
sleep 30

echo ""
echo "5️⃣ Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "6️⃣ Testing backend health..."
sleep 10
curl -f http://localhost:3002/health && echo "✅ Backend is healthy" || echo "❌ Backend still not responding"

echo ""
echo "7️⃣ Testing through nginx..."
curl -f http://localhost/api/health && echo "✅ Nginx proxy working" || echo "❌ Nginx proxy still failing"

echo ""
echo "8️⃣ Showing recent logs..."
echo "Backend logs:"
docker logs attendance-dashboard-backend-1 --tail 10

echo ""
echo "Nginx logs:"
docker logs attendance-dashboard-nginx-1 --tail 10

echo ""
echo "✅ Quick fix attempt complete!"
echo ""
echo "🌐 Test your site now:"
echo "  - Frontend: http://my.fullship.net"
echo "  - API Health: http://my.fullship.net/api/health"
echo ""
echo "📋 If still not working, run:"
echo "  ./diagnose-bad-gateway.sh"
