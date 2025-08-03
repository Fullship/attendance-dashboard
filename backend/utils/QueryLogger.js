const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Enhanced Query Logger for detecting N+1 patterns and similar query detection
 */
class QueryLogger {
  constructor(options = {}) {
    this.logsDir = options.logsDir || path.join(__dirname, '..', 'logs');
    this.enabled = options.enabled !== false;
    this.trackSimilarQueries = options.trackSimilarQueries !== false;
    this.nPlusOneThreshold = options.nPlusOneThreshold || 3; // Detect when 3+ similar queries run within timeframe
    this.timeWindowMs = options.timeWindowMs || 1000; // 1 second window for N+1 detection
    this.maxLogFileSize = options.maxLogFileSize || 50 * 1024 * 1024; // 50MB

    // In-memory tracking for pattern detection
    this.queryPatterns = new Map(); // queryHash -> { count, firstSeen, lastSeen, examples }
    this.recentQueries = []; // Array of recent queries for N+1 detection
    this.executionContext = new Map(); // requestId -> { queries, startTime }

    // Initialize logging directory
    this.initializeLogging();
  }

  async initializeLogging() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  /**
   * Normalize a SQL query to detect similar patterns
   * Replaces parameters with placeholders to group similar queries
   */
  normalizeQuery(query) {
    return (
      query
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
        // Replace string literals with placeholder
        .replace(/'[^']*'/g, "'?'")
        // Replace numbers with placeholder (but preserve SQL keywords like LIMIT, OFFSET)
        .replace(/\b\d+\b(?!\s*(LIMIT|OFFSET|,))/gi, '?')
        // Replace parameter placeholders ($1, $2, etc.) with generic placeholder
        .replace(/\$\d+/g, '$?')
        // Replace IN clauses with multiple values
        .replace(/IN\s*\([^)]+\)/gi, 'IN (?)')
        // Normalize case for better grouping
        .toLowerCase()
    );
  }

  /**
   * Generate a hash for the normalized query pattern
   */
  getQueryHash(normalizedQuery) {
    return crypto.createHash('md5').update(normalizedQuery).digest('hex').substring(0, 8);
  }

  /**
   * Extract table names from a SQL query
   */
  extractTableNames(query) {
    const tables = new Set();
    const normalizedQuery = query.toLowerCase();

    // Extract FROM clauses
    const fromMatches = normalizedQuery.match(/from\s+(\w+)/g);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.replace(/from\s+/, '');
        tables.add(table);
      });
    }

    // Extract JOIN clauses
    const joinMatches = normalizedQuery.match(/join\s+(\w+)/g);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/join\s+/, '');
        tables.add(table);
      });
    }

    // Extract INSERT INTO, UPDATE, DELETE FROM
    const crudMatches = normalizedQuery.match(/(insert\s+into|update|delete\s+from)\s+(\w+)/g);
    if (crudMatches) {
      crudMatches.forEach(match => {
        const parts = match.split(/\s+/);
        const table = parts[parts.length - 1];
        tables.add(table);
      });
    }

    return Array.from(tables);
  }

  /**
   * Start tracking queries for a specific request context
   */
  startRequestContext(requestId) {
    this.executionContext.set(requestId, {
      queries: [],
      startTime: Date.now(),
      requestId,
    });
  }

  /**
   * End tracking for a request context and analyze for N+1 patterns
   */
  async endRequestContext(requestId) {
    const context = this.executionContext.get(requestId);
    if (!context) return null;

    const analysis = await this.analyzeRequestQueries(context);
    this.executionContext.delete(requestId);

    return analysis;
  }

  /**
   * Log a query execution
   */
  async logQuery(queryData) {
    if (!this.enabled) return;

    const { queryId, query, params, duration, rowCount, error, requestId, stackTrace } = queryData;

    const timestamp = new Date().toISOString();
    const normalizedQuery = this.normalizeQuery(query);
    const queryHash = this.getQueryHash(normalizedQuery);
    const tables = this.extractTableNames(query);

    // Track the query
    const queryInfo = {
      queryId,
      query,
      normalizedQuery,
      queryHash,
      params,
      duration,
      rowCount,
      error,
      timestamp,
      tables,
      requestId,
      stackTrace,
    };

    // Add to recent queries for N+1 detection
    this.recentQueries.push(queryInfo);

    // Keep only recent queries (last 10 seconds)
    const cutoffTime = Date.now() - 10000;
    this.recentQueries = this.recentQueries.filter(
      q => new Date(q.timestamp).getTime() > cutoffTime
    );

    // Track query patterns
    if (this.trackSimilarQueries) {
      await this.trackQueryPattern(queryHash, queryInfo);
    }

    // Add to request context if available
    if (requestId && this.executionContext.has(requestId)) {
      this.executionContext.get(requestId).queries.push(queryInfo);
    }

    // Log to file
    await this.writeQueryLog(queryInfo);

    // Check for immediate N+1 patterns
    await this.detectRealtimeNPlusOne(queryInfo);

    return queryInfo;
  }

  /**
   * Track query patterns for similar query detection
   */
  async trackQueryPattern(queryHash, queryInfo) {
    if (!this.queryPatterns.has(queryHash)) {
      this.queryPatterns.set(queryHash, {
        queryHash,
        normalizedQuery: queryInfo.normalizedQuery,
        count: 0,
        firstSeen: queryInfo.timestamp,
        lastSeen: queryInfo.timestamp,
        examples: [],
        tables: queryInfo.tables,
        avgDuration: 0,
        totalDuration: 0,
      });
    }

    const pattern = this.queryPatterns.get(queryHash);
    pattern.count++;
    pattern.lastSeen = queryInfo.timestamp;
    pattern.totalDuration += queryInfo.duration;
    pattern.avgDuration = pattern.totalDuration / pattern.count;

    // Keep a few examples (up to 3)
    if (pattern.examples.length < 3) {
      pattern.examples.push({
        queryId: queryInfo.queryId,
        params: queryInfo.params,
        duration: queryInfo.duration,
        timestamp: queryInfo.timestamp,
        requestId: queryInfo.requestId,
      });
    }

    // Log frequent patterns
    if (pattern.count > 0 && pattern.count % 10 === 0) {
      await this.logFrequentPattern(pattern);
    }
  }

  /**
   * Detect N+1 queries in real-time
   */
  async detectRealtimeNPlusOne(currentQuery) {
    const cutoffTime = Date.now() - this.timeWindowMs;
    const recentSimilar = this.recentQueries.filter(
      q => q.queryHash === currentQuery.queryHash && new Date(q.timestamp).getTime() > cutoffTime
    );

    if (recentSimilar.length >= this.nPlusOneThreshold) {
      await this.logNPlusOnePattern({
        pattern: currentQuery.normalizedQuery,
        queryHash: currentQuery.queryHash,
        count: recentSimilar.length,
        timeWindow: this.timeWindowMs,
        queries: recentSimilar,
        detectedAt: new Date().toISOString(),
        tables: currentQuery.tables,
      });
    }
  }

  /**
   * Analyze all queries from a request context
   */
  async analyzeRequestQueries(context) {
    const { queries, startTime, requestId } = context;
    const analysis = {
      requestId,
      totalQueries: queries.length,
      totalDuration: queries.reduce((sum, q) => sum + q.duration, 0),
      requestDuration: Date.now() - startTime,
      nPlusOnePatterns: [],
      duplicateQueries: [],
      slowQueries: queries.filter(q => q.duration > 200),
      tablesAccessed: [...new Set(queries.flatMap(q => q.tables))],
      queryBreakdown: {},
    };

    // Group queries by pattern
    const patternGroups = new Map();
    queries.forEach(query => {
      const key = query.queryHash;
      if (!patternGroups.has(key)) {
        patternGroups.set(key, []);
      }
      patternGroups.get(key).push(query);
    });

    // Detect N+1 patterns within this request
    patternGroups.forEach((groupQueries, hash) => {
      if (groupQueries.length >= this.nPlusOneThreshold) {
        analysis.nPlusOnePatterns.push({
          pattern: groupQueries[0].normalizedQuery,
          count: groupQueries.length,
          queries: groupQueries.map(q => ({
            queryId: q.queryId,
            params: q.params,
            duration: q.duration,
          })),
          totalDuration: groupQueries.reduce((sum, q) => sum + q.duration, 0),
          avgDuration: groupQueries.reduce((sum, q) => sum + q.duration, 0) / groupQueries.length,
        });
      }

      // Track exact duplicates (same query + same params)
      const exactDuplicates = new Map();
      groupQueries.forEach(query => {
        const key = JSON.stringify(query.params);
        if (!exactDuplicates.has(key)) {
          exactDuplicates.set(key, []);
        }
        exactDuplicates.get(key).push(query);
      });

      exactDuplicates.forEach((dupQueries, paramsKey) => {
        if (dupQueries.length > 1) {
          analysis.duplicateQueries.push({
            pattern: dupQueries[0].normalizedQuery,
            params: dupQueries[0].params,
            count: dupQueries.length,
            queries: dupQueries.map(q => ({ queryId: q.queryId, duration: q.duration })),
          });
        }
      });
    });

    // Query breakdown by type
    queries.forEach(query => {
      const type = this.getQueryType(query.query);
      if (!analysis.queryBreakdown[type]) {
        analysis.queryBreakdown[type] = { count: 0, totalDuration: 0 };
      }
      analysis.queryBreakdown[type].count++;
      analysis.queryBreakdown[type].totalDuration += query.duration;
    });

    // Log significant findings
    if (analysis.nPlusOnePatterns.length > 0 || analysis.duplicateQueries.length > 0) {
      await this.logRequestAnalysis(analysis);
    }

    return analysis;
  }

  /**
   * Get query type (SELECT, INSERT, UPDATE, DELETE)
   */
  getQueryType(query) {
    const normalized = query.trim().toLowerCase();
    if (normalized.startsWith('select')) return 'SELECT';
    if (normalized.startsWith('insert')) return 'INSERT';
    if (normalized.startsWith('update')) return 'UPDATE';
    if (normalized.startsWith('delete')) return 'DELETE';
    if (normalized.startsWith('with')) return 'CTE';
    return 'OTHER';
  }

  /**
   * Write query log to file
   */
  async writeQueryLog(queryInfo) {
    const logFile = path.join(
      this.logsDir,
      `query-log-${new Date().toISOString().split('T')[0]}.jsonl`
    );

    try {
      const logEntry =
        JSON.stringify({
          timestamp: queryInfo.timestamp,
          queryId: queryInfo.queryId,
          queryHash: queryInfo.queryHash,
          query: queryInfo.query.substring(0, 500), // Truncate very long queries
          normalizedQuery: queryInfo.normalizedQuery,
          params: queryInfo.params,
          duration: queryInfo.duration,
          rowCount: queryInfo.rowCount,
          error: queryInfo.error,
          tables: queryInfo.tables,
          requestId: queryInfo.requestId,
        }) + '\n';

      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write query log:', error);
    }
  }

  /**
   * Log N+1 pattern detection
   */
  async logNPlusOnePattern(patternData) {
    const logFile = path.join(
      this.logsDir,
      `n-plus-one-${new Date().toISOString().split('T')[0]}.jsonl`
    );

    try {
      const logEntry = JSON.stringify(patternData) + '\n';
      await fs.appendFile(logFile, logEntry);

      console.warn(
        `🚨 N+1 Query Pattern Detected: ${patternData.count} similar queries in ${patternData.timeWindow}ms`
      );
      console.warn(`   Pattern: ${patternData.pattern}`);
      console.warn(`   Tables: ${patternData.tables.join(', ')}`);
    } catch (error) {
      console.error('Failed to write N+1 pattern log:', error);
    }
  }

  /**
   * Log frequent query patterns
   */
  async logFrequentPattern(pattern) {
    const logFile = path.join(
      this.logsDir,
      `frequent-patterns-${new Date().toISOString().split('T')[0]}.jsonl`
    );

    try {
      const logEntry = JSON.stringify(pattern) + '\n';
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write frequent pattern log:', error);
    }
  }

  /**
   * Log request analysis results
   */
  async logRequestAnalysis(analysis) {
    const logFile = path.join(
      this.logsDir,
      `request-analysis-${new Date().toISOString().split('T')[0]}.jsonl`
    );

    try {
      const logEntry = JSON.stringify(analysis) + '\n';
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write request analysis log:', error);
    }
  }

  /**
   * Get current query statistics
   */
  getStatistics() {
    const stats = {
      totalPatterns: this.queryPatterns.size,
      recentQueries: this.recentQueries.length,
      activeContexts: this.executionContext.size,
      topPatterns: [],
    };

    // Get top 10 most frequent patterns
    const patterns = Array.from(this.queryPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topPatterns = patterns.map(p => ({
      queryHash: p.queryHash,
      normalizedQuery: p.normalizedQuery.substring(0, 100),
      count: p.count,
      avgDuration: Math.round(p.avgDuration),
      tables: p.tables,
    }));

    return stats;
  }

  /**
   * Clear old data to prevent memory leaks
   */
  cleanup() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old patterns
    for (const [hash, pattern] of this.queryPatterns.entries()) {
      if (new Date(pattern.lastSeen).getTime() < cutoffTime) {
        this.queryPatterns.delete(hash);
      }
    }

    // Clean up old contexts
    for (const [id, context] of this.executionContext.entries()) {
      if (context.startTime < cutoffTime) {
        this.executionContext.delete(id);
      }
    }
  }
}

module.exports = QueryLogger;
