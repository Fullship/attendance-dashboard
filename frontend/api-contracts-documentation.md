# API Contract Documentation

## GET /api/admin/metrics

**Description:** Get real-time system metrics

**Expected Status:** 200

**Response Schema:**
```json
{
  "requests": {
    "total": "number",
    "rps": "number"
  },
  "responseTime": {
    "avg": "number",
    "p95": "number",
    "p99": "number"
  },
  "memory": {
    "used": "number",
    "total": "number",
    "percentage": "number"
  },
  "cpu": {
    "usage": "number",
    "load": "array"
  },
  "database": {
    "connections": "number",
    "queries": "number"
  },
  "cache": {
    "hitRate": "number",
    "operations": "number"
  },
  "errors": {
    "rate": "number",
    "count": "number"
  },
  "activeUsers": "number"
}
```

**Mock Response:**
```json
{
  "requests": {
    "total": 45678,
    "rps": 23.5
  },
  "responseTime": {
    "avg": 45.2,
    "p95": 120.3,
    "p99": 234.5
  },
  "memory": {
    "used": 536870912,
    "total": 2147483648,
    "percentage": 25
  },
  "cpu": {
    "usage": 35.2,
    "load": [
      0.5,
      0.8,
      1.2
    ]
  },
  "database": {
    "connections": 15,
    "queries": 1234
  },
  "cache": {
    "hitRate": 87.5,
    "operations": 5678
  },
  "errors": {
    "rate": 0.2,
    "count": 12
  },
  "activeUsers": 142
}
```

---

## GET /api/admin/cache/stats

**Description:** Get cache statistics and performance metrics

**Expected Status:** 200

**Response Schema:**
```json
{
  "hitRate": "number",
  "missRate": "number",
  "totalOperations": "number",
  "totalHits": "number",
  "totalMisses": "number",
  "memory": {
    "used": "number",
    "available": "number",
    "percentage": "number"
  },
  "keys": {
    "total": "number",
    "expired": "number",
    "withTtl": "number"
  },
  "performance": {
    "avgResponseTime": "number",
    "operationsPerSecond": "number"
  },
  "byType": "object"
}
```

**Mock Response:**
```json
{
  "hitRate": 87.5,
  "missRate": 12.5,
  "totalOperations": 15432,
  "totalHits": 13503,
  "totalMisses": 1929,
  "memory": {
    "used": 134217728,
    "available": 536870912,
    "percentage": 25
  },
  "keys": {
    "total": 2341,
    "expired": 45,
    "withTtl": 1876
  },
  "performance": {
    "avgResponseTime": 2.3,
    "operationsPerSecond": 234.5
  },
  "byType": {
    "user_sessions": {
      "hits": 5623,
      "misses": 234,
      "operations": 5857
    },
    "api_cache": {
      "hits": 4521,
      "misses": 678,
      "operations": 5199
    },
    "page_cache": {
      "hits": 3359,
      "misses": 1017,
      "operations": 4376
    }
  }
}
```

---

## GET /api/admin/cluster/status

**Description:** Get cluster worker status and health information

**Expected Status:** 200

**Response Schema:**
```json
{
  "master": {
    "pid": "number",
    "uptime": "number",
    "memory": "number"
  },
  "workers": "array",
  "stats": {
    "totalWorkers": "number",
    "aliveWorkers": "number",
    "totalMemory": "number",
    "totalRequests": "number",
    "totalConnections": "number",
    "restartCount": "number"
  },
  "health": "string"
}
```

**Mock Response:**
```json
{
  "master": {
    "pid": 8754,
    "uptime": 3600,
    "memory": 67108864
  },
  "workers": [
    {
      "id": 1,
      "pid": 8755,
      "uptime": 3600,
      "restarts": 0,
      "status": "online",
      "memory": 47185920,
      "cpu": 25.3,
      "connections": 23,
      "requests": 4567
    }
  ],
  "stats": {
    "totalWorkers": 4,
    "aliveWorkers": 4,
    "totalMemory": 1073741824,
    "totalRequests": 45678,
    "totalConnections": 156,
    "restartCount": 0
  },
  "health": "healthy"
}
```

---

