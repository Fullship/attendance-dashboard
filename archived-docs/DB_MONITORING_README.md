# PostgreSQL Query Performance Monitoring

This document describes the comprehensive PostgreSQL query performance monitoring system implemented in the attendance dashboard backend.

## Overview

The system provides:
- **Real-time query duration logging** with automatic instrumentation
- **EXPLAIN ANALYZE** for queries exceeding 200ms threshold
- **Slow query analysis** with pattern recognition and optimization recommendations
- **CLI tools** for analysis and monitoring
- **REST API endpoints** for programmatic access to performance data
- **Automated reporting** and log management

## Components

### 1. Enhanced Database Configuration (`config/database.js`)

The enhanced pool configuration includes:
- Query duration instrumentation
- Automatic EXPLAIN ANALYZE for slow queries (>200ms)
- Query statistics tracking
- Structured logging to JSON files

**Key Features:**
- Transparent query interception
- Configurable slow query threshold (200ms)
- Real-time statistics collection
- Error logging and analysis

### 2. Slow Query Analyzer (`utils/slow-query-analyzer.js`)

Provides analysis capabilities:
- Parse daily slow query logs
- Group queries by pattern
- Generate performance recommendations
- Export analysis reports

### 3. CLI Tool (`slow-query-cli.js`)

Command-line interface for:
- Generating detailed reports
- Real-time query monitoring
- Log file management
- Statistics viewing

### 4. REST API (`middleware/database-monitoring.js`)

Web API endpoints for:
- Query statistics
- Slow query analysis
- Pool status monitoring
- Health checks

## Configuration

### Environment Variables

```bash
# Enable/disable query logging (default: enabled in development)
ENABLE_QUERY_LOGGING=true

# Enable/disable EXPLAIN ANALYZE for slow queries
ENABLE_EXPLAIN_ANALYZE=true

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=your_user
DB_PASSWORD=your_password
```

### Threshold Configuration

The slow query threshold is set to **200ms** and can be modified in:
- `config/database.js` - Change `SLOW_QUERY_THRESHOLD_MS` constant
- Performance analysis considers queries above this threshold as "slow"

## Usage

### 1. CLI Commands

```bash
# Generate today's slow query report
node slow-query-cli.js report

# Generate report for specific date
node slow-query-cli.js report 2025-01-15

# Show current query statistics
node slow-query-cli.js stats

# List available log dates
node slow-query-cli.js list

# Clean up logs older than 30 days
node slow-query-cli.js cleanup 30

# Watch for slow queries in real-time
node slow-query-cli.js watch

# Show help
node slow-query-cli.js help
```

### 2. REST API Endpoints

All endpoints are mounted under `/api/admin/db-monitor`:

#### Query Statistics
```bash
# Get current query statistics
GET /api/admin/db-monitor/stats

# Reset query statistics
POST /api/admin/db-monitor/stats/reset
```

#### Slow Query Analysis
```bash
# Get today's slow query analysis
GET /api/admin/db-monitor/slow-queries

# Get analysis for specific date
GET /api/admin/db-monitor/slow-queries/2025-01-15

# Get formatted report
GET /api/admin/db-monitor/report?date=2025-01-15&format=text
GET /api/admin/db-monitor/report?date=2025-01-15&format=json
```

#### Log Management
```bash
# List available log dates
GET /api/admin/db-monitor/logs/dates

# Clean up old logs
POST /api/admin/db-monitor/logs/cleanup
Content-Type: application/json
{"days": 30}
```

#### Pool and Health Monitoring
```bash
# Get connection pool statistics
GET /api/admin/db-monitor/pool

# Database health check
GET /api/admin/db-monitor/health
```

### 3. Programmatic Access

```javascript
const pool = require('./config/database');

// Get current query statistics
const stats = pool.getQueryStats();
console.log('Average query duration:', stats.averageDuration);

// Reset statistics
pool.resetQueryStats();
```

## Log Files

The system generates several types of log files in the `backend/logs/` directory:

### 1. Daily Slow Query Logs
- **Format**: `slow-queries-YYYY-MM-DD.jsonl`
- **Content**: One JSON object per line with query details
- **Fields**: queryId, query, params, duration, rowCount, timestamp, error

### 2. EXPLAIN ANALYZE Results
- **Format**: `explain-analyze-YYYY-MM-DD.json`
- **Content**: Detailed query execution plans for slow queries
- **Fields**: Query details + PostgreSQL EXPLAIN ANALYZE output

### 3. Generated Reports
- **Format**: `slow-query-report-YYYY-MM-DD.txt`
- **Content**: Human-readable analysis reports
- **Generated**: By CLI tool or API calls

## Performance Analysis Features

### 1. Query Pattern Recognition

The analyzer groups similar queries by:
- Normalizing parameter placeholders (`$1`, `$2` → `$?`)
- Replacing literal values with placeholders
- Standardizing whitespace and case

### 2. Optimization Recommendations

Automatic detection of common performance issues:
- `SELECT *` usage
- LIKE queries with leading wildcards
- Unsafe UPDATE/DELETE without WHERE
- Large JOINs without proper filtering
- ORDER BY without LIMIT on large datasets

### 3. Statistical Analysis

For each query pattern:
- Occurrence count
- Total execution time (impact)
- Average, min, max duration
- Recent examples with parameters

## Monitoring Dashboard

### Real-time Statistics

The system tracks:
- Total queries executed
- Number of slow queries
- Slow query percentage
- Average query duration
- System uptime since last reset

### Connection Pool Monitoring

Monitor pool health:
- Active connections
- Idle connections
- Waiting connections
- Pool configuration limits

## Integration Examples

### 1. Add to Express Route

```javascript
app.get('/admin/performance', async (req, res) => {
  const stats = pool.getQueryStats();
  const analysis = await analyzer.analyzeSlowQueries();
  
  res.json({
    statistics: stats,
    slowQueries: analysis.topSlowQueries.slice(0, 5),
    recommendations: analysis.recommendations
  });
});
```

### 2. Custom Monitoring Alert

```javascript
setInterval(async () => {
  const stats = pool.getQueryStats();
  
  if (stats.slowQueryPercentage > 10) {
    console.warn(`⚠️  High slow query rate: ${stats.slowQueryPercentage}%`);
    // Send alert notification
  }
}, 60000); // Check every minute
```

### 3. Performance Dashboard Widget

```javascript
// Frontend component data fetching
const fetchPerformanceData = async () => {
  const response = await fetch('/api/admin/db-monitor/stats');
  const data = await response.json();
  
  return {
    totalQueries: data.data.totalQueries,
    slowQueries: data.data.slowQueries,
    averageDuration: data.data.averageDuration,
    slowQueryPercentage: data.data.slowQueryPercentage
  };
};
```

## Best Practices

### 1. Log Retention

- Keep 30 days of detailed logs by default
- Archive older logs for compliance if needed
- Use cleanup commands regularly to manage disk space

### 2. Threshold Tuning

- 200ms is a reasonable starting threshold
- Adjust based on your application's performance requirements
- Consider different thresholds for different query types

### 3. EXPLAIN ANALYZE Usage

- Enable in development and staging environments
- Use cautiously in production (adds overhead)
- Disable for high-traffic periods if needed

### 4. Monitoring Schedule

- Review daily reports during development
- Set up weekly performance reviews
- Monitor real-time during load testing

## Troubleshooting

### Common Issues

1. **Logs directory not created**
   - The system automatically creates `backend/logs/`
   - Ensure write permissions for the Node.js process

2. **Query statistics not available**
   - Verify enhanced database configuration is loaded
   - Check for console errors during startup

3. **EXPLAIN ANALYZE failures**
   - Some queries may not support EXPLAIN ANALYZE
   - Errors are logged but don't affect the main query

### Debug Mode

Enable detailed logging:

```bash
ENABLE_QUERY_LOGGING=true node server.js
```

This will log all queries with their execution times and parameters.

## Performance Impact

### Overhead Analysis

- Query interception: ~1-2ms per query
- Statistics collection: Minimal (in-memory)
- Log writing: Asynchronous, non-blocking
- EXPLAIN ANALYZE: Only for slow queries (200ms+)

### Production Considerations

- Monitor disk space usage for log files
- Consider increasing slow query threshold in high-traffic environments
- Disable EXPLAIN ANALYZE if overhead becomes significant
- Use log rotation for long-running deployments

## Future Enhancements

Potential improvements:
- Query fingerprinting for better pattern recognition
- Integration with external monitoring tools (Grafana, DataDog)
- Automated index suggestions based on slow query patterns
- Real-time alerts for critical performance degradation
- Historical trend analysis and reporting
