#!/bin/bash

# Redis Setup and Start Script for Attendance Dashboard
echo "🚀 Setting up Redis for Attendance Dashboard Performance Optimization..."

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Installing Redis..."
    
    # Check OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "📦 Installing Redis via Homebrew..."
            brew install redis
        else
            echo "❌ Homebrew not found. Please install Homebrew first or install Redis manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            echo "📦 Installing Redis via apt..."
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            echo "📦 Installing Redis via yum..."
            sudo yum install -y redis
        else
            echo "❌ Package manager not found. Please install Redis manually."
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install Redis manually."
        exit 1
    fi
fi

# Check if Redis is running
if pgrep -x "redis-server" > /dev/null; then
    echo "✅ Redis is already running"
else
    echo "🔄 Starting Redis server..."
    
    # Start Redis in the background
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS with Homebrew
        brew services start redis
        echo "✅ Redis started via Homebrew services"
    else
        # Linux or manual start
        redis-server --daemonize yes
        echo "✅ Redis started as daemon"
    fi
    
    # Wait a moment for Redis to start
    sleep 2
fi

# Test Redis connection
echo "🧪 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is responding to ping"
    
    # Show Redis info
    echo ""
    echo "📊 Redis Server Info:"
    redis-cli info server | grep -E "redis_version|os|process_id|tcp_port"
    echo ""
    
    # Test our cache system
    echo "🔧 Testing attendance dashboard cache system..."
    cd "$(dirname "$0")"
    node test-redis.js
    
else
    echo "❌ Redis is not responding. Please check Redis installation."
    exit 1
fi

echo ""
echo "🎉 Redis setup complete!"
echo ""
echo "📋 Next steps:"
echo "   • Start the attendance dashboard backend: npm start"
echo "   • Redis will automatically provide performance optimization"
echo "   • Monitor cache performance in server logs"
echo ""
echo "🛠️  Redis Management Commands:"
echo "   • Check status: redis-cli ping"
echo "   • Monitor: redis-cli monitor"
echo "   • Stop: redis-cli shutdown (or brew services stop redis on macOS)"
echo ""
