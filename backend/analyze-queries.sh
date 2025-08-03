#!/bin/bash

# Query Pattern Analysis Script
# Usage: ./analyze-queries.sh [date] [format]
# Example: ./analyze-queries.sh 2024-01-15 html

DATE=${1:-$(date +%Y-%m-%d)}
FORMAT=${2:-console}

echo "🔍 Analyzing query patterns for $DATE..."

cd "$(dirname "$0")"

# Ensure logs directory exists
mkdir -p logs

# Run the analysis
node scripts/analyze-query-patterns.js "$DATE" "$FORMAT"

# Show quick stats
if [ -f "logs/query-log-$DATE.jsonl" ]; then
    echo ""
    echo "📊 Quick Statistics:"
    echo "   Total log entries: $(wc -l < logs/query-log-$DATE.jsonl)"
    
    if [ -f "logs/n-plus-one-$DATE.jsonl" ]; then
        echo "   N+1 patterns found: $(wc -l < logs/n-plus-one-$DATE.jsonl)"
    else
        echo "   N+1 patterns found: 0"
    fi
    
    if [ -f "logs/slow-queries-$DATE.jsonl" ]; then
        echo "   Slow queries found: $(wc -l < logs/slow-queries-$DATE.jsonl)"
    else
        echo "   Slow queries found: 0"
    fi
else
    echo "⚠️  No query logs found for $DATE"
    echo "   Make sure query logging is enabled and the application has been running"
fi

echo ""
echo "💡 To enable query logging, set environment variable:"
echo "   export ENABLE_N_PLUS_ONE_DETECTION=true"
echo ""
echo "📁 Log files are stored in: $(pwd)/logs/"
