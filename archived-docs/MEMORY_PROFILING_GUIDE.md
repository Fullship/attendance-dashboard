# 🧠 Memory Profiling Guide

## Overview

This guide explains how to use the integrated heapdump memory profiling tools to analyze memory usage, detect memory leaks, and optimize performance in the attendance dashboard application.

## Setup

### 1. Prerequisites

```bash
# Ensure you're in development mode
export NODE_ENV=development

# Install heapdump (already installed)
npm install heapdump --save-dev

# Optional: Enable manual garbage collection
node --expose-gc server.js
```

### 2. Directory Structure

```
backend/
├── memory-snapshots/           # Heap snapshots stored here
│   ├── heapdump-001-*.heapsnapshot
│   ├── heapdump-002-*.heapsnapshot
│   └── snapshots.log          # Snapshot metadata log
└── utils/
    └── MemoryProfiler.js      # Memory profiling utility
```

## API Endpoints

### Base URL: `/api/admin/dev/memory`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/instructions` | Get setup and usage instructions |
| GET | `/stats` | Get current memory statistics |
| POST | `/snapshot` | Take a memory snapshot |
| GET | `/snapshots` | List all snapshots |
| DELETE | `/snapshots?keepCount=10` | Clean up old snapshots |
| POST | `/gc` | Force garbage collection |
| POST | `/compare-operation` | Compare memory before/after operation |

## Usage Examples

### 1. Get Current Memory Statistics

```bash
curl -X GET "http://localhost:3001/api/admin/dev/memory/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "memory": {
      "rss": "156.2 MB",
      "heapTotal": "89.5 MB",
      "heapUsed": "67.3 MB",
      "heapUsedPercentage": "75.20%",
      "external": "2.1 MB",
      "arrayBuffers": "0.8 MB"
    },
    "cpu": {
      "user": 125432,
      "system": 89213
    },
    "process": {
      "uptime": 1234.56,
      "pid": 12345,
      "platform": "darwin",
      "nodeVersion": "v18.17.0"
    },
    "system": {
      "totalMemory": "16.0 GB",
      "freeMemory": "4.2 GB",
      "cpus": 8,
      "loadAverage": [2.1, 2.3, 2.5]
    }
  },
  "profilerAvailable": true,
  "timestamp": "2025-07-18T10:30:00.000Z"
}
```

### 2. Take a Memory Snapshot

```bash
curl -X POST "http://localhost:3001/api/admin/dev/memory/snapshot" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "after-upload-processing"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Memory snapshot taken successfully",
  "snapshot": {
    "filename": "heapdump-001-2025-07-18T10-30-00-000Z-after-upload-processing.heapsnapshot",
    "filepath": "/path/to/memory-snapshots/heapdump-001-*.heapsnapshot",
    "label": "after-upload-processing",
    "timestamp": "2025-07-18T10:30:00.000Z",
    "counter": 1,
    "memoryUsage": {
      "rss": "156.2 MB",
      "heapTotal": "89.5 MB",
      "heapUsed": "67.3 MB",
      "external": "2.1 MB",
      "arrayBuffers": "0.8 MB"
    },
    "fileSize": "45.2 MB"
  },
  "instructions": {
    "analysis": "Open Chrome DevTools > Memory tab > Load Profile > Select the .heapsnapshot file",
    "location": "/path/to/snapshot/file"
  }
}
```

### 3. Compare Memory Before/After Operation

```bash
curl -X POST "http://localhost:3001/api/admin/dev/memory/compare-operation" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get-attendance",
    "label": "large-query-test"
  }'
```

**Available Operations:**
- `get-attendance` - Fetch attendance records
- `get-users` - Fetch user data
- `get-dashboard-stats` - Calculate dashboard statistics
- `force-gc` - Force garbage collection

### 4. List All Snapshots

```bash
curl -X GET "http://localhost:3001/api/admin/dev/memory/snapshots" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Clean Up Old Snapshots

```bash
curl -X DELETE "http://localhost:3001/api/admin/dev/memory/snapshots?keepCount=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Memory Analysis with Chrome DevTools

### 1. Opening Snapshots

1. Open Chrome and press `F12` to open DevTools
2. Go to the **Memory** tab
3. Click **Load Profile**
4. Select your `.heapsnapshot` file from the `memory-snapshots` directory

### 2. Analyzing Single Snapshots

#### Constructor View
- Shows objects grouped by their constructor
- Look for:
  - Large object counts
  - Unexpected object types
  - Objects that should have been garbage collected

#### Dominators View
- Shows objects sorted by retained size
- Identifies objects holding the most memory
- Useful for finding memory leaks

### 3. Comparing Snapshots

#### Taking Comparison Snapshots
```bash
# Take baseline snapshot
curl -X POST "http://localhost:3001/api/admin/dev/memory/snapshot" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"label": "baseline"}'

# Perform memory-intensive operation
# (e.g., upload large file, process data)

# Take after snapshot
curl -X POST "http://localhost:3001/api/admin/dev/memory/snapshot" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"label": "after-operation"}'
```

#### Comparison Analysis
1. Load both snapshots in Chrome DevTools
2. Select **Comparison** view
3. Choose the baseline snapshot
4. Look for:
   - **Delta**: Objects that increased/decreased
   - **Alloc. Size**: Memory allocated
   - **Freed Size**: Memory freed
   - **Size Delta**: Net memory change

### 4. Memory Leak Detection

#### Signs of Memory Leaks
- Objects that should be garbage collected but aren't
- Increasing object counts between snapshots
- Detached DOM nodes (in frontend)
- Event listeners not being removed
- Closures holding references

#### Investigation Steps
1. Take snapshots at regular intervals
2. Look for objects with increasing counts
3. Check the **Retainers** view to see what's holding references
4. Trace back to the root cause

## Common Memory Issues and Solutions

### 1. Database Connection Leaks

**Problem:** Database connections not being properly closed

**Detection:**
```bash
# Take snapshot, run queries, take another snapshot
curl -X POST ".../compare-operation" -d '{"operation": "get-attendance"}'
```

**Solution:**
```javascript
// Always use connection pools and proper cleanup
const result = await pool.query(sql, params);
// Connection automatically returned to pool
```

### 2. Cache Memory Growth

**Problem:** Redis cache or in-memory cache growing indefinitely

**Detection:**
- Monitor heap size over time
- Look for objects related to caching

**Solution:**
```javascript
// Implement TTL and size limits
const cache = new Map();
const MAX_CACHE_SIZE = 1000;

if (cache.size > MAX_CACHE_SIZE) {
  const firstKey = cache.keys().next().value;
  cache.delete(firstKey);
}
```

### 3. Large Object Retention

**Problem:** Large objects (like file uploads) not being garbage collected

**Detection:**
```bash
# Compare memory before/after file upload
curl -X POST ".../compare-operation" -d '{"operation": "get-attendance", "label": "file-upload-test"}'
```

**Solution:**
```javascript
// Explicitly null large objects
let largeData = processLargeFile();
// Use the data...
largeData = null; // Help GC
```

### 4. Event Listener Accumulation

**Problem:** Event listeners not being removed

**Detection:**
- Look for increasing EventListener objects
- Check for DOM-related objects in Node.js

**Solution:**
```javascript
// Remove listeners when done
emitter.removeListener('event', handler);
// Or use once() for one-time listeners
emitter.once('event', handler);
```

## Performance Testing Workflow

### 1. Baseline Testing

```bash
# 1. Start with clean state
curl -X POST ".../gc"  # Force GC

# 2. Take baseline snapshot
curl -X POST ".../snapshot" -d '{"label": "baseline"}'

# 3. Get memory stats
curl -X GET ".../stats"
```

### 2. Load Testing

```bash
# 1. Perform operations
for i in {1..100}; do
  # Upload files, process data, etc.
done

# 2. Take snapshot
curl -X POST ".../snapshot" -d '{"label": "after-load-test"}'

# 3. Force GC and take another snapshot
curl -X POST ".../gc"
curl -X POST ".../snapshot" -d '{"label": "after-gc"}'
```

### 3. Analysis

1. Compare baseline vs after-load-test
2. Check what memory was freed after GC
3. Identify objects that weren't freed

## Automation Scripts

### Memory Monitoring Script

```bash
#!/bin/bash
# monitor-memory.sh

API_BASE="http://localhost:3001/api/admin/dev/memory"
TOKEN="YOUR_TOKEN"

echo "Starting memory monitoring..."

# Take initial snapshot
curl -s -X POST "$API_BASE/snapshot" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"label": "monitoring-start"}' > /dev/null

while true; do
  # Get current stats
  STATS=$(curl -s -X GET "$API_BASE/stats" \
    -H "Authorization: Bearer $TOKEN")
  
  HEAP_USED=$(echo $STATS | jq -r '.stats.memory.heapUsed')
  HEAP_PERCENT=$(echo $STATS | jq -r '.stats.memory.heapUsedPercentage')
  
  echo "$(date): Heap Used: $HEAP_USED ($HEAP_PERCENT)"
  
  # Take snapshot if memory usage is high
  if [[ $HEAP_PERCENT > "80%" ]]; then
    echo "High memory usage detected, taking snapshot..."
    curl -s -X POST "$API_BASE/snapshot" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"label": "high-memory-usage"}' > /dev/null
  fi
  
  sleep 60  # Check every minute
done
```

### Leak Detection Script

```bash
#!/bin/bash
# detect-leaks.sh

API_BASE="http://localhost:3001/api/admin/dev/memory"
TOKEN="YOUR_TOKEN"

echo "Running memory leak detection..."

for i in {1..10}; do
  echo "Iteration $i..."
  
  # Take snapshot
  curl -s -X POST "$API_BASE/snapshot" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"label\": \"iteration-$i\"}" > /dev/null
  
  # Perform test operations
  curl -s -X POST "$API_BASE/compare-operation" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"operation": "get-attendance"}' > /dev/null
  
  # Force GC
  curl -s -X POST "$API_BASE/gc" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  
  sleep 10
done

echo "Leak detection complete. Check snapshots in Chrome DevTools."
```

## Best Practices

### 1. When to Take Snapshots
- **Before/after major operations** (file uploads, batch processing)
- **During peak usage** to identify bottlenecks
- **After suspected memory leaks** to confirm
- **Regularly during development** to catch issues early

### 2. Snapshot Management
- **Label snapshots clearly** with operation context
- **Clean up old snapshots** regularly (keep 10-20 recent ones)
- **Document findings** in the snapshots.log file

### 3. Analysis Tips
- **Focus on object counts** rather than just memory size
- **Look for unexpected growth** between snapshots
- **Check retainer trees** to understand references
- **Use filters** to focus on specific object types

### 4. Performance Considerations
- **Only enable in development** - heapdump has overhead
- **Don't take snapshots in production** - they can be large
- **Use selective profiling** during specific operations
- **Monitor snapshot file sizes** - they can be several MB each

## Troubleshooting

### Heapdump Not Available
```bash
# Check if heapdump is installed
npm list heapdump

# Reinstall if needed
npm install heapdump --save-dev

# Check NODE_ENV
echo $NODE_ENV  # Should be 'development'
```

### Large Snapshot Files
- Snapshots can be 50-500MB depending on heap size
- Ensure adequate disk space
- Use cleanup endpoint regularly

### Chrome DevTools Issues
- Use latest Chrome version
- Large snapshots may take time to load
- Consider using Node.js built-in profiling for very large heaps

## Additional Resources

- [Chrome DevTools Memory Tab](https://developer.chrome.com/docs/devtools/memory/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [V8 Heap Profiling](https://v8.dev/docs/memory)
- [Memory Leak Detection Patterns](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Remember:** Memory profiling is a powerful tool for optimization, but it should be used judiciously. Focus on real performance issues rather than micro-optimizations, and always test in environments similar to production.
