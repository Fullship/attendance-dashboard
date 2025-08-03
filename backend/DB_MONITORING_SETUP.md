# PostgreSQL Query Performance Monitoring - Quick Setup

## ✅ What's Been Added

Your backend now includes comprehensive PostgreSQL query performance monitoring with:

1. **Automatic Query Instrumentation** - All queries are automatically timed and logged
2. **Slow Query Detection** - Queries >200ms are flagged and analyzed
3. **EXPLAIN ANALYZE** - Automatic execution plan analysis for slow queries
4. **CLI Tools** - Command-line utilities for analysis and monitoring
5. **REST API** - Web endpoints for programmatic access
6. **Intelligent Analysis** - Pattern recognition and optimization recommendations

## 🚀 Quick Start

### 1. Enable Query Logging (Optional - enabled by default in development)

```bash
# In your .env file
ENABLE_QUERY_LOGGING=true
ENABLE_EXPLAIN_ANALYZE=true
```

### 2. Test the Instrumentation

```bash
# Run the test script
npm run db:test-instrumentation
```

### 3. Start Your Server and Generate Some Queries

```bash
# Start the server
npm run dev

# The instrumentation will automatically start logging queries
```

### 4. Analyze Slow Queries

```bash
# Generate today's slow query report
npm run db:slow-query-report

# Show current query statistics
npm run db:slow-query-stats

# Watch for slow queries in real-time
npm run db:slow-query-watch
```

## 📊 Available Commands

### NPM Scripts
```bash
npm run db:slow-query-report      # Generate detailed analysis report
npm run db:slow-query-stats       # Show current query statistics
npm run db:slow-query-watch       # Real-time slow query monitoring
npm run db:slow-query-cleanup     # Clean up old log files
npm run db:test-instrumentation   # Test the monitoring system
```

### Direct CLI Usage
```bash
node slow-query-cli.js report                 # Today's report
node slow-query-cli.js report 2025-01-15     # Specific date
node slow-query-cli.js stats                  # Current statistics
node slow-query-cli.js list                   # Available log dates
node slow-query-cli.js cleanup 30             # Clean logs >30 days
node slow-query-cli.js watch                  # Real-time monitoring
```

## 🌐 REST API Endpoints

All endpoints are available under `/api/admin/db-monitor`:

```bash
# Query Statistics
GET  /api/admin/db-monitor/stats              # Current statistics
POST /api/admin/db-monitor/stats/reset        # Reset statistics

# Slow Query Analysis
GET  /api/admin/db-monitor/slow-queries       # Today's analysis
GET  /api/admin/db-monitor/slow-queries/2025-01-15  # Specific date
GET  /api/admin/db-monitor/report?date=2025-01-15   # Formatted report

# Log Management
GET  /api/admin/db-monitor/logs/dates         # Available log dates
POST /api/admin/db-monitor/logs/cleanup       # Clean up old logs

# Pool & Health
GET  /api/admin/db-monitor/pool               # Connection pool stats
GET  /api/admin/db-monitor/health             # Database health check
```

## 📁 Log Files

The system creates log files in `backend/logs/`:

- `slow-queries-YYYY-MM-DD.jsonl` - Daily slow query logs
- `explain-analyze-YYYY-MM-DD.json` - EXPLAIN ANALYZE results
- `slow-query-report-YYYY-MM-DD.txt` - Generated reports

## 🔧 Configuration

### Slow Query Threshold
- **Default**: 200ms
- **Location**: `config/database.js` - `SLOW_QUERY_THRESHOLD_MS`

### Environment Variables
```bash
ENABLE_QUERY_LOGGING=true        # Enable query logging
ENABLE_EXPLAIN_ANALYZE=true      # Enable EXPLAIN ANALYZE for slow queries
```

## 🎯 What to Look For

### 1. Immediate Feedback
- Console logs showing query durations
- Warnings for slow queries (>200ms)
- Error logging for failed queries

### 2. Daily Analysis
- Run the report to see slow query patterns
- Get optimization recommendations
- Identify problematic queries

### 3. Real-time Monitoring
- Use the watch command during development
- Monitor query performance during load testing
- Track improvements after optimization

## 🚨 Performance Impact

The monitoring system is designed to be lightweight:
- **Query interception**: ~1-2ms overhead per query
- **Statistics**: In-memory, minimal impact
- **Logging**: Asynchronous, non-blocking
- **EXPLAIN ANALYZE**: Only for slow queries

## 📈 Example Workflow

1. **Development**: Monitor queries in real-time
```bash
npm run db:slow-query-watch
```

2. **Daily Review**: Check for performance issues
```bash
npm run db:slow-query-report
```

3. **Optimization**: Use recommendations to improve queries

4. **Validation**: Compare before/after statistics
```bash
npm run db:slow-query-stats
```

## 🔍 Troubleshooting

### No Statistics Available
- Ensure enhanced database config is loaded
- Check console for database connection errors

### No Slow Queries Logged
- Lower the threshold temporarily for testing
- Verify `ENABLE_QUERY_LOGGING=true`
- Run the test script to generate sample data

### Logs Directory Missing
- The system auto-creates `backend/logs/`
- Ensure Node.js has write permissions

## 🎉 Next Steps

1. **Test the System**: Run `npm run db:test-instrumentation`
2. **Generate Load**: Use your app normally or run load tests
3. **Analyze Results**: Run `npm run db:slow-query-report`
4. **Optimize**: Follow the recommendations
5. **Monitor**: Use real-time watching during critical operations

The monitoring system is now active and will automatically start collecting data as soon as you run queries against your database!
