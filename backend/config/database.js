const { Pool } = require('pg');
const fs = require('fs');
const { promises: fsPromises } = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const split = require('split2');
const path = require('path');
const StreamingJsonProcessor = require('../utils/StreamingJsonProcessor');
const QueryLogger = require('../utils/QueryLogger');

// Query performance monitoring configuration
const SLOW_QUERY_THRESHOLD_MS = 200;
const ENABLE_QUERY_LOGGING =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_QUERY_LOGGING === 'true';
const ENABLE_EXPLAIN_ANALYZE =
  process.env.ENABLE_EXPLAIN_ANALYZE === 'true' || process.env.NODE_ENV === 'development';
const ENABLE_N_PLUS_ONE_DETECTION = process.env.ENABLE_N_PLUS_ONE_DETECTION !== 'false'; // Enabled by default

// Ensure logs directory exists (async)
const logsDir = path.join(__dirname, '..', 'logs');
const initializeLogging = async () => {
  try {
    await fsPromises.access(logsDir);
  } catch {
    await fsPromises.mkdir(logsDir, { recursive: true });
  }
};

// Initialize logging directory
initializeLogging().catch(console.error);

// Initialize enhanced query logger for N+1 detection
const queryLogger = new QueryLogger({
  logsDir,
  enabled: ENABLE_N_PLUS_ONE_DETECTION,
  trackSimilarQueries: true,
  nPlusOneThreshold: 3,
  timeWindowMs: 1000,
});

// Cleanup query logger memory periodically
setInterval(() => {
  queryLogger.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

// Query statistics tracking
const queryStats = {
  totalQueries: 0,
  slowQueries: 0,
  totalDuration: 0,
  averageDuration: 0,
  lastReset: new Date(),
};

// Optimized pool configuration for better performance
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),

  // SSL Configuration (disable for Docker internal networks)
  ssl: process.env.DB_SSL === 'false' ? false : 
       process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } :
       process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Performance optimizations
  max: 20, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times

  // Additional performance settings
  statement_timeout: 60000, // 60 seconds timeout for queries
  query_timeout: 60000, // 60 seconds timeout for queries
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Enhanced query method with instrumentation and N+1 detection
const originalQuery = pool.query.bind(pool);

pool.query = async function (text, params, callback) {
  const startTime = Date.now();
  const queryId = Math.random().toString(36).substring(7);

  // Handle different function signatures
  let actualText = text;
  let actualParams = params;
  let actualCallback = callback;

  if (typeof text === 'object') {
    // Handle query config object
    actualText = text.text;
    actualParams = text.values;
    actualCallback = params; // callback is second param in this case
  } else if (typeof params === 'function') {
    // Handle (text, callback) signature
    actualCallback = params;
    actualParams = undefined;
  }

  // Normalize query text for logging (remove extra whitespace)
  const normalizedQuery = actualText.replace(/\s+/g, ' ').trim();

  // Get request context for N+1 detection (from async_hooks or manual tracking)
  const requestId = getRequestId(); // We'll need to implement this

  if (ENABLE_QUERY_LOGGING) {
    console.log(
      `[DB Query ${queryId}] Starting: ${normalizedQuery.substring(0, 100)}${
        normalizedQuery.length > 100 ? '...' : ''
      }`
    );
    if (actualParams && actualParams.length > 0) {
      console.log(`[DB Query ${queryId}] Params: ${JSON.stringify(actualParams)}`);
    }
  }

  try {
    let result;

    // Execute the original query
    if (actualCallback) {
      // Callback-style
      result = await new Promise((resolve, reject) => {
        originalQuery(actualText, actualParams, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    } else {
      // Promise-style
      result = await originalQuery(actualText, actualParams);
    }

    const duration = Date.now() - startTime;

    // Update query statistics
    queryStats.totalQueries++;
    queryStats.totalDuration += duration;
    queryStats.averageDuration = queryStats.totalDuration / queryStats.totalQueries;

    // Log to enhanced query logger for N+1 detection
    if (ENABLE_N_PLUS_ONE_DETECTION) {
      await queryLogger.logQuery({
        queryId,
        query: actualText,
        params: actualParams,
        duration,
        rowCount: result.rowCount || 0,
        requestId,
        stackTrace: getStackTrace(),
      });
    }

    // Log query completion
    if (ENABLE_QUERY_LOGGING) {
      const logLevel = duration > SLOW_QUERY_THRESHOLD_MS ? 'WARN' : 'INFO';
      console.log(
        `[DB Query ${queryId}] Completed in ${duration}ms [${logLevel}] Rows: ${
          result.rowCount || 0
        }`
      );
    }

    // Handle slow queries
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      queryStats.slowQueries++;
      await handleSlowQuery(queryId, normalizedQuery, actualParams, duration, result);
    }

    // Call original callback if provided
    if (actualCallback) {
      actualCallback(null, result);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error to enhanced query logger
    if (ENABLE_N_PLUS_ONE_DETECTION) {
      await queryLogger.logQuery({
        queryId,
        query: actualText,
        params: actualParams,
        duration,
        error: error.message,
        requestId,
        stackTrace: getStackTrace(),
      });
    }

    if (ENABLE_QUERY_LOGGING) {
      console.error(`[DB Query ${queryId}] ERROR after ${duration}ms: ${error.message}`);
    }

    // Log error to slow query log as well
    await logSlowQuery({
      queryId,
      query: normalizedQuery,
      params: actualParams,
      duration,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // Call original callback with error if provided
    if (actualCallback) {
      actualCallback(error);
      return;
    }

    throw error;
  }
};

// Handle slow query analysis
async function handleSlowQuery(queryId, query, params, duration, result) {
  const slowQueryData = {
    queryId,
    query,
    params,
    duration,
    rowCount: result?.rowCount || 0,
    timestamp: new Date().toISOString(),
  };

  // Log to slow query file
  await logSlowQuery(slowQueryData);

  // Run EXPLAIN ANALYZE for slow queries (if enabled and not already an EXPLAIN query)
  if (ENABLE_EXPLAIN_ANALYZE && !query.toLowerCase().includes('explain')) {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const explainResult = await originalQuery(explainQuery, params);

      slowQueryData.explainAnalyze = explainResult.rows[0]['QUERY PLAN'];

      // Log explain analyze results
      console.log(`[DB Query ${queryId}] EXPLAIN ANALYZE results:`);
      console.log(JSON.stringify(explainResult.rows[0]['QUERY PLAN'], null, 2));

      // Save detailed analysis to file
      await logExplainAnalyze(queryId, slowQueryData);
    } catch (explainError) {
      console.error(`[DB Query ${queryId}] EXPLAIN ANALYZE failed: ${explainError.message}`);
    }
  }
}

// Log slow queries to file
async function logSlowQuery(data) {
  const logFile = path.join(
    logsDir,
    `slow-queries-${new Date().toISOString().split('T')[0]}.jsonl`
  );
  const logEntry = JSON.stringify(data) + '\n';

  try {
    await fs.promises.appendFile(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write slow query log:', error);
  }
}

// Log detailed EXPLAIN ANALYZE results
async function logExplainAnalyze(queryId, data) {
  const logFile = path.join(
    logsDir,
    `explain-analyze-${new Date().toISOString().split('T')[0]}.jsonl`
  );

  try {
    // Use streaming JSON processor instead of synchronous operations
    await StreamingJsonProcessor.appendJsonLine(logFile, {
      queryId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error('Failed to write explain analyze log:', error);
  }
}

// Get query statistics
pool.getQueryStats = function () {
  return {
    ...queryStats,
    slowQueryPercentage:
      queryStats.totalQueries > 0
        ? ((queryStats.slowQueries / queryStats.totalQueries) * 100).toFixed(2)
        : 0,
    uptime: Date.now() - queryStats.lastReset.getTime(),
    queryLoggerStats: queryLogger.getStatistics(),
  };
};

// Reset query statistics
pool.resetQueryStats = function () {
  queryStats.totalQueries = 0;
  queryStats.slowQueries = 0;
  queryStats.totalDuration = 0;
  queryStats.averageDuration = 0;
  queryStats.lastReset = new Date();
};

// Request context tracking for N+1 detection
const requestContexts = new Map();

function getRequestId() {
  // Try to get from async local storage or headers
  // For now, return a simple ID based on the current execution context
  const stack = new Error().stack;
  const contextId = stack ? stack.split('\n')[3] : 'unknown';
  return contextId.substring(0, 16);
}

function getStackTrace() {
  const stack = new Error().stack;
  if (!stack) return null;

  // Filter out database-related stack frames to get application code
  const lines = stack.split('\n').slice(1);
  const relevantLines = lines
    .filter(
      line =>
        !line.includes('database.js') &&
        !line.includes('node_modules') &&
        !line.includes('internal/')
    )
    .slice(0, 5);

  return relevantLines.join('\n');
}

// Expose query logger methods
pool.startRequestContext = function (requestId) {
  return queryLogger.startRequestContext(requestId);
};

pool.endRequestContext = function (requestId) {
  return queryLogger.endRequestContext(requestId);
};

pool.getQueryLogger = function () {
  return queryLogger;
};

// Test database connection
pool.on('connect', client => {
  console.log('Connected to PostgreSQL database');

  // Set up connection-level logging if needed
  if (ENABLE_QUERY_LOGGING) {
    console.log(`Database connection established. PID: ${client.processID}`);
  }
});

pool.on('error', err => {
  console.error('Database connection error:', err);
});

module.exports = pool;
