const crypto = require('crypto');
const pool = require('../config/database');

/**
 * Middleware for tracking database queries per request to detect N+1 patterns
 */
function queryTrackingMiddleware(req, res, next) {
  // Generate unique request ID
  const requestId = `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Store request ID for access in route handlers
  req.requestId = requestId;

  // Start tracking queries for this request
  const queryLogger = pool.getQueryLogger();
  queryLogger.startRequestContext(requestId);

  // Track request start time
  req.queryTrackingStart = Date.now();

  // Override res.end to analyze queries when request completes
  const originalEnd = res.end;
  res.end = async function (...args) {
    try {
      // Analyze queries for this request
      const analysis = await queryLogger.endRequestContext(requestId);

      if (analysis) {
        const requestDuration = Date.now() - req.queryTrackingStart;

        // Log request analysis if there are performance issues
        const hasIssues =
          analysis.nPlusOnePatterns.length > 0 ||
          analysis.duplicateQueries.length > 0 ||
          analysis.slowQueries.length > 0 ||
          analysis.totalQueries > 10;

        if (hasIssues) {
          console.warn(`🔍 Query Analysis for ${req.method} ${req.path}:`);
          console.warn(`   Request ID: ${requestId}`);
          console.warn(`   Total Queries: ${analysis.totalQueries}`);
          console.warn(`   Query Duration: ${analysis.totalDuration}ms`);
          console.warn(`   Request Duration: ${requestDuration}ms`);
          console.warn(`   N+1 Patterns: ${analysis.nPlusOnePatterns.length}`);
          console.warn(`   Duplicate Queries: ${analysis.duplicateQueries.length}`);
          console.warn(`   Slow Queries: ${analysis.slowQueries.length}`);
          console.warn(`   Tables Accessed: ${analysis.tablesAccessed.join(', ')}`);

          // Log specific N+1 patterns
          if (analysis.nPlusOnePatterns.length > 0) {
            console.warn(`   🚨 N+1 Patterns Detected:`);
            analysis.nPlusOnePatterns.forEach((pattern, i) => {
              console.warn(
                `     ${i + 1}. ${pattern.pattern.substring(0, 80)}... (${pattern.count} times)`
              );
            });
          }
        }

        // Add analysis to response headers for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
          res.setHeader('X-Query-Count', analysis.totalQueries);
          res.setHeader('X-Query-Duration', analysis.totalDuration);
          res.setHeader('X-N-Plus-One-Count', analysis.nPlusOnePatterns.length);
          res.setHeader('X-Duplicate-Query-Count', analysis.duplicateQueries.length);
        }
      }
    } catch (error) {
      console.error('Error in query tracking middleware:', error);
    }

    // Call original end method
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Express middleware factory with options
 */
function createQueryTrackingMiddleware(options = {}) {
  const {
    enabled = process.env.NODE_ENV !== 'production',
    logThreshold = 5, // Log requests with more than 5 queries
    includeHeaders = process.env.NODE_ENV === 'development',
  } = options;

  if (!enabled) {
    return (req, res, next) => next();
  }

  return queryTrackingMiddleware;
}

module.exports = {
  queryTrackingMiddleware,
  createQueryTrackingMiddleware,
};
