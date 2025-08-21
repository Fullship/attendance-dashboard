# Query Logging and N+1 Detection System

This document describes the comprehensive query logging and N+1 detection system implemented in the attendance dashboard backend.

## Overview

The system provides:
- Real-time query logging and performance monitoring
- N+1 query pattern detection
- Performance analysis and reporting
- Live monitoring dashboard
- Detailed query pattern analysis

## Components

### 1. QueryLogger (`backend/utils/QueryLogger.js`)

The core logging system that tracks all database queries and detects patterns.

**Features:**
- Query normalization and pattern recognition
- N+1 detection using similarity analysis
- Request context tracking
- Performance metrics collection
- Multiple log file outputs

**Usage:**
```javascript
const QueryLogger = require('./utils/QueryLogger');
const logger = new QueryLogger();

// Log a query
logger.logQuery(query, duration, context);

// Get statistics
const stats = logger.getStatistics();
```

### 2. Query Tracking Middleware (`backend/middleware/queryTracking.js`)

Express middleware that tracks queries per request to identify N+1 patterns.

**Features:**
- Request-level query tracking
- Automatic N+1 detection
- Performance analysis per endpoint
- Request context preservation

**Integration:**
```javascript
const { createQueryTrackingMiddleware } = require('./middleware/queryTracking');

app.use('/api/', createQueryTrackingMiddleware({
  enableN1Detection: true,
  logSlowQueries: true,
  slowQueryThreshold: 500
}));
```

### 3. Performance API (`backend/routes/performance.js`)

REST API endpoints for accessing query statistics and analysis.

**Endpoints:**

#### GET `/api/performance/query-stats`
Get real-time query statistics.

**Response:**
```json
{
  "totalQueries": 1250,
  "averageDuration": 45.2,
  "slowQueries": [...],
  "cacheHitRate": 78.5
}
```

#### GET `/api/performance/query-patterns`
Get query pattern analysis.

**Response:**
```json
{
  "queryPatterns": {
    "SELECT * FROM users WHERE id = $1": {
      "count": 125,
      "avgDuration": 12.3,
      "potentialN1": false
    }
  },
  "n1Alerts": [...]
}
```

#### GET `/api/performance/analysis-report/:date?`
Generate comprehensive analysis report.

**Response:**
```json
{
  "date": "2024-01-15",
  "totalQueries": 1250,
  "uniquePatterns": 45,
  "n1Patterns": 3,
  "performanceIssues": 8,
  "recommendations": [
    "Consider using JOIN queries to eliminate N+1 patterns",
    "Add database indexes for slow queries"
  ]
}
```

#### GET `/api/performance/live-queries`
Server-Sent Events endpoint for real-time monitoring.

**Usage:**
```javascript
const eventSource = new EventSource('/api/performance/live-queries');
eventSource.onmessage = (event) => {
  const stats = JSON.parse(event.data);
  console.log('Live stats:', stats);
};
```

### 4. Pattern Analysis Script (`backend/scripts/analyze-query-patterns.js`)

Command-line tool for analyzing query logs and generating reports.

**Usage:**
```bash
# Analyze today's logs
node scripts/analyze-query-patterns.js

# Analyze specific date
node scripts/analyze-query-patterns.js --date 2024-01-15

# Generate HTML report
node scripts/analyze-query-patterns.js --format html --output report.html

# Analyze and output JSON
node scripts/analyze-query-patterns.js --format json > analysis.json
```

**Options:**
- `--date`: Specific date to analyze (YYYY-MM-DD)
- `--format`: Output format (console, json, html)
- `--output`: Output file path
- `--min-duration`: Minimum query duration to include
- `--max-results`: Maximum number of results per category

### 5. Database Integration (`backend/config/database.js`)

Enhanced database configuration with integrated query logging.

**Features:**
- Automatic query interception
- Context-aware logging
- Performance monitoring
- Stack trace capture for debugging

## Log Files

The system generates several types of log files in `backend/logs/`:

### Query Logs (`queries-YYYY-MM-DD.jsonl`)
Individual query executions with timing and context.

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "queryHash": "abc123...",
  "normalizedQuery": "SELECT * FROM users WHERE id = $1",
  "duration": 12.3,
  "requestId": "req_abc123",
  "tables": ["users"],
  "stackTrace": "..."
}
```

### N+1 Pattern Logs (`n-plus-one-YYYY-MM-DD.jsonl`)
Detected N+1 query patterns.

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "pattern": "SELECT * FROM users WHERE id = $1",
  "requestId": "req_abc123",
  "queries": [...],
  "confidence": 0.95,
  "recommendation": "Consider using JOIN or eager loading"
}
```

### Request Analysis Logs (`request-analysis-YYYY-MM-DD.jsonl`)
Per-request query analysis.

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "requestId": "req_abc123",
  "endpoint": "GET /api/users",
  "totalQueries": 25,
  "totalDuration": 450.2,
  "potentialN1": true,
  "patterns": [...]
}
```

### Slow Query Logs (`slow-queries-YYYY-MM-DD.jsonl`)
Queries exceeding performance thresholds.

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "queryHash": "def456...",
  "normalizedQuery": "SELECT * FROM attendance WHERE date BETWEEN $1 AND $2",
  "duration": 1250.5,
  "requestId": "req_def456",
  "recommendation": "Add index on date column"
}
```

## Testing

### Automated Testing

Use the test script to verify the system:

```bash
cd backend
node test-query-logging.js
```

This will:
1. Login as admin
2. Trigger various API calls to generate queries
3. Check query statistics
4. Verify N+1 detection
5. Generate analysis reports

### Manual Testing

1. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

2. **Make API requests:**
   ```bash
   # Login
   curl -X POST http://localhost:3002/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'

   # Make requests to generate queries
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3002/api/users
   ```

3. **Check statistics:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3002/api/performance/query-stats
   ```

## Configuration

### Environment Variables

```env
# Query logging settings
QUERY_LOG_ENABLED=true
QUERY_LOG_SLOW_THRESHOLD=500
QUERY_LOG_N1_THRESHOLD=5
QUERY_LOG_MAX_ENTRIES=10000

# Log file settings
QUERY_LOG_DIR=./logs
QUERY_LOG_RETENTION_DAYS=30
```

### QueryLogger Options

```javascript
const logger = new QueryLogger({
  slowQueryThreshold: 500,        // ms
  n1DetectionThreshold: 5,        // queries
  similarityThreshold: 0.8,       // 0-1
  maxLogEntries: 10000,           // memory limit
  logDirectory: './logs',         // log file directory
  enableFileLogging: true,        // write to files
  enableConsoleLogging: false,    // console output
  retentionDays: 30              // log retention
});
```

## Monitoring and Alerts

### N+1 Detection

The system automatically detects N+1 patterns by:
1. Tracking similar queries within a request
2. Analyzing query similarity using string distance
3. Checking execution frequency and timing
4. Generating alerts when thresholds are exceeded

### Performance Thresholds

Default thresholds:
- **Slow Query**: >500ms
- **N+1 Detection**: >5 similar queries per request
- **Similarity Threshold**: 80% string similarity
- **High Frequency**: >50 executions per pattern

### Real-time Monitoring

Access live statistics via:
- Server-Sent Events: `GET /api/performance/live-queries`
- REST API: `GET /api/performance/query-stats`
- WebSocket integration (if needed)

## Optimization Recommendations

Based on analysis, the system provides automatic recommendations:

1. **N+1 Patterns:**
   - Use JOIN queries instead of separate lookups
   - Implement eager loading for related data
   - Consider batching API calls

2. **Slow Queries:**
   - Add database indexes
   - Optimize WHERE clauses
   - Review query complexity

3. **High Frequency Queries:**
   - Implement result caching
   - Use connection pooling
   - Consider read replicas

4. **General Performance:**
   - Review pagination implementation
   - Optimize database schema
   - Monitor connection limits

## Troubleshooting

### Common Issues

1. **Logs not being generated:**
   - Check file permissions on logs directory
   - Verify QUERY_LOG_ENABLED=true
   - Check disk space

2. **N+1 detection not working:**
   - Verify middleware is loaded before routes
   - Check similarity threshold settings
   - Review request ID generation

3. **High memory usage:**
   - Reduce maxLogEntries setting
   - Enable log file rotation
   - Clear old log files

4. **Performance impact:**
   - Disable console logging in production
   - Adjust logging thresholds
   - Use sampling for high-traffic endpoints

### Debug Mode

Enable detailed logging:

```javascript
const logger = new QueryLogger({
  enableConsoleLogging: true,
  logLevel: 'debug'
});
```

### Log Analysis

For detailed analysis:

```bash
# Count total queries
grep -c "queryHash" logs/queries-$(date +%Y-%m-%d).jsonl

# Find slow queries
jq 'select(.duration > 1000)' logs/queries-$(date +%Y-%m-%d).jsonl

# Analyze N+1 patterns
jq '.pattern' logs/n-plus-one-$(date +%Y-%m-%d).jsonl | sort | uniq -c
```

## Security Considerations

1. **Log File Protection:**
   - Restrict access to log files
   - Avoid logging sensitive data in queries
   - Implement log rotation and cleanup

2. **API Access:**
   - Performance endpoints require admin authentication
   - Rate limiting on analysis endpoints
   - Sanitize query output in logs

3. **Data Privacy:**
   - Query parameters are normalized/anonymized
   - No user data stored in logs
   - Configurable log retention

## Future Enhancements

Potential improvements:
1. Machine learning for pattern detection
2. Predictive performance analysis
3. Integration with APM tools
4. Automated optimization suggestions
5. Historical trend analysis
6. Alert notifications (email/Slack)
7. Query execution plan analysis
8. Database-specific optimizations
