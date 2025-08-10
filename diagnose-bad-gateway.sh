#!/bin/bash

# Bad Gateway Emergency Diagnostic Script
# Run this on your server to diagnose the 502 error

echo "🔍 Bad Gateway Diagnostic Script - $(date)"
echo "=========================================="

echo ""
echo "1️⃣ Checking Docker containers status..."
docker ps

echo ""
echo "2️⃣ Checking Docker Compose services..."
cd /path/to/your/attendance-dashboard
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "3️⃣ Checking backend health directly..."
curl -v http://localhost:3002/health 2>&1

echo ""
echo "4️⃣ Checking backend logs (last 20 lines)..."
docker logs attendance-dashboard-backend-1 --tail 20

echo ""
echo "5️⃣ Checking nginx logs (last 10 lines)..."
docker logs attendance-dashboard-nginx-1 --tail 10

echo ""
echo "6️⃣ Testing nginx configuration..."
docker exec attendance-dashboard-nginx-1 nginx -t 2>&1

echo ""
echo "7️⃣ Checking if nginx can reach backend..."
docker exec attendance-dashboard-nginx-1 curl -s http://backend:3002/health 2>&1 || echo "❌ Nginx cannot reach backend"

echo ""
echo "8️⃣ Checking Docker network..."
docker network ls | grep attendance

echo ""
echo "9️⃣ Checking ports listening..."
netstat -tlnp | grep -E "(80|3002|443)"

echo ""
echo "🔟 Checking system resources..."
echo "Memory usage:"
free -h
echo "Disk usage:"
df -h /

echo ""
echo "📋 Quick Fix Commands:"
echo "----------------------------------------"
echo "# Restart all services:"
echo "docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "# Rebuild and restart:"
echo "docker-compose -f docker-compose.prod.yml down"
echo "docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "# Check real-time logs:"
echo "docker-compose -f docker-compose.prod.yml logs -f"

echo ""
echo "✅ Diagnostic complete. Review output above for issues."
