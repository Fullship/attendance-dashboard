#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { createReadStream } = require('fs');

/**
 * Query Pattern Analyzer - Analyzes logged queries to detect N+1 patterns and performance issues
 */
class QueryPatternAnalyzer {
  constructor(logsDir) {
    this.logsDir = logsDir || path.join(__dirname, '..', 'logs');
    this.patterns = new Map();
    this.nPlusOnePatterns = [];
    this.slowQueries = [];
    this.requestAnalyses = [];
    this.duplicateQueries = [];
  }

  /**
   * Analyze all log files for a specific date or date range
   */
  async analyzeDate(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`📊 Analyzing query patterns for ${targetDate}...`);

    await Promise.all([
      this.analyzeQueryLogs(targetDate),
      this.analyzeNPlusOneLogs(targetDate),
      this.analyzeRequestAnalysisLogs(targetDate),
      this.analyzeSlowQueryLogs(targetDate),
    ]);

    return this.generateReport();
  }

  /**
   * Analyze main query logs
   */
  async analyzeQueryLogs(date) {
    const logFile = path.join(this.logsDir, `query-log-${date}.jsonl`);

    try {
      await fs.access(logFile);
    } catch {
      console.log(`No query log found for ${date}`);
      return;
    }

    const fileStream = createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const query = JSON.parse(line);
          this.processQueryLog(query);
          lineCount++;
        } catch (error) {
          console.warn(`Failed to parse query log line: ${error.message}`);
        }
      }
    }

    console.log(`✅ Processed ${lineCount} query log entries`);
  }

  /**
   * Analyze N+1 pattern logs
   */
  async analyzeNPlusOneLogs(date) {
    const logFile = path.join(this.logsDir, `n-plus-one-${date}.jsonl`);

    try {
      await fs.access(logFile);
    } catch {
      console.log(`No N+1 pattern log found for ${date}`);
      return;
    }

    const fileStream = createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const pattern = JSON.parse(line);
          this.nPlusOnePatterns.push(pattern);
          lineCount++;
        } catch (error) {
          console.warn(`Failed to parse N+1 pattern log line: ${error.message}`);
        }
      }
    }

    console.log(`✅ Found ${lineCount} N+1 patterns`);
  }

  /**
   * Analyze request analysis logs
   */
  async analyzeRequestAnalysisLogs(date) {
    const logFile = path.join(this.logsDir, `request-analysis-${date}.jsonl`);

    try {
      await fs.access(logFile);
    } catch {
      console.log(`No request analysis log found for ${date}`);
      return;
    }

    const fileStream = createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const analysis = JSON.parse(line);
          this.requestAnalyses.push(analysis);
          lineCount++;
        } catch (error) {
          console.warn(`Failed to parse request analysis log line: ${error.message}`);
        }
      }
    }

    console.log(`✅ Processed ${lineCount} request analyses`);
  }

  /**
   * Analyze slow query logs
   */
  async analyzeSlowQueryLogs(date) {
    const logFile = path.join(this.logsDir, `slow-queries-${date}.jsonl`);

    try {
      await fs.access(logFile);
    } catch {
      console.log(`No slow query log found for ${date}`);
      return;
    }

    const fileStream = createReadStream(logFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const slowQuery = JSON.parse(line);
          this.slowQueries.push(slowQuery);
          lineCount++;
        } catch (error) {
          console.warn(`Failed to parse slow query log line: ${error.message}`);
        }
      }
    }

    console.log(`✅ Found ${lineCount} slow queries`);
  }

  /**
   * Analyze logs for a specific date (for API usage)
   */
  async analyzeDate(date) {
    try {
      this.reset();

      // Process all log types for the date
      await this.analyzeQueryLogs(date);
      await this.analyzeNPlusOneLogs(date);
      await this.analyzeRequestAnalysisLogs(date);
      await this.analyzeSlowQueryLogs(date);

      // Generate summary statistics
      const summary = this.generateSummary();

      return {
        date,
        totalQueries: this.patterns.size,
        uniquePatterns: this.patterns.size,
        n1Patterns: this.nPlusOnePatterns.length,
        slowQueries: this.slowQueries.length,
        performanceIssues: this.getPerformanceIssues().length,
        recommendations: this.generateRecommendations(),
        patterns: this.getPatternsArray(),
        n1Details: this.nPlusOnePatterns,
        slowQueryDetails: this.slowQueries,
        requestAnalyses: this.requestAnalyses,
        summary,
      };
    } catch (error) {
      throw new Error(`Failed to analyze date ${date}: ${error.message}`);
    }
  }

  /**
   * Reset analyzer state
   */
  reset() {
    this.patterns.clear();
    this.nPlusOnePatterns = [];
    this.requestAnalyses = [];
    this.slowQueries = [];
  }

  /**
   * Get patterns as array for API response
   */
  getPatternsArray() {
    return Array.from(this.patterns.values()).map(pattern => ({
      ...pattern,
      tables: Array.from(pattern.tables),
      requestIds: Array.from(pattern.requestIds),
    }));
  }

  /**
   * Get performance issues
   */
  getPerformanceIssues() {
    const issues = [];

    // Add N+1 patterns as issues
    this.nPlusOnePatterns.forEach(pattern => {
      issues.push({
        type: 'n+1',
        severity: 'high',
        description: `N+1 query pattern detected: ${pattern.pattern}`,
        count: pattern.queries?.length || 0,
        pattern: pattern.pattern,
      });
    });

    // Add slow queries as issues
    this.slowQueries.forEach(query => {
      issues.push({
        type: 'slow_query',
        severity: query.duration > 1000 ? 'high' : 'medium',
        description: `Slow query detected (${query.duration}ms)`,
        duration: query.duration,
        query: query.normalizedQuery,
      });
    });

    // Add high-frequency patterns as potential issues
    Array.from(this.patterns.values())
      .filter(pattern => pattern.count > 50)
      .forEach(pattern => {
        issues.push({
          type: 'high_frequency',
          severity: 'medium',
          description: `High frequency query pattern (${pattern.count} executions)`,
          count: pattern.count,
          avgDuration: pattern.avgDuration,
          pattern: pattern.normalizedQuery,
        });
      });

    return issues;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // N+1 recommendations
    if (this.nPlusOnePatterns.length > 0) {
      recommendations.push(
        'Consider using JOIN queries or eager loading to eliminate N+1 patterns'
      );
      recommendations.push(
        'Review API endpoints that fetch related data to optimize query patterns'
      );
    }

    // Slow query recommendations
    if (this.slowQueries.length > 0) {
      recommendations.push('Add database indexes for slow queries');
      recommendations.push('Consider query optimization for queries taking >500ms');
    }

    // High frequency pattern recommendations
    const highFreqPatterns = Array.from(this.patterns.values()).filter(
      pattern => pattern.count > 20
    );

    if (highFreqPatterns.length > 0) {
      recommendations.push('Consider caching for frequently executed queries');
      recommendations.push('Review pagination implementation for list endpoints');
    }

    // General recommendations
    if (this.patterns.size > 100) {
      recommendations.push('Consider implementing query result caching');
      recommendations.push('Review database connection pooling configuration');
    }

    return recommendations;
  }

  /**
   * Process individual query log entry
   */
  processQueryLog(query) {
    const { queryHash, normalizedQuery, duration, tables, requestId } = query;

    // Track patterns
    if (!this.patterns.has(queryHash)) {
      this.patterns.set(queryHash, {
        queryHash,
        normalizedQuery,
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        tables: new Set(tables || []),
        requestIds: new Set(),
        examples: [],
      });
    }

    const pattern = this.patterns.get(queryHash);
    pattern.count++;
    pattern.totalDuration += duration;
    pattern.avgDuration = pattern.totalDuration / pattern.count;
    pattern.minDuration = Math.min(pattern.minDuration, duration);
    pattern.maxDuration = Math.max(pattern.maxDuration, duration);

    if (requestId) pattern.requestIds.add(requestId);
    if (tables) tables.forEach(table => pattern.tables.add(table));

    // Keep some examples
    if (pattern.examples.length < 5) {
      pattern.examples.push({
        queryId: query.queryId,
        duration,
        timestamp: query.timestamp,
        params: query.params,
      });
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport() {
    const report = {
      summary: this.generateSummary(),
      topProblems: this.identifyTopProblems(),
      nPlusOneAnalysis: this.analyzeNPlusOnePatterns(),
      slowQueryAnalysis: this.analyzeSlowQueries(),
      requestAnalysis: this.analyzeRequests(),
      recommendations: this.generateRecommendations(),
      patterns: this.getTopPatterns(),
    };

    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const totalQueries = Array.from(this.patterns.values()).reduce((sum, p) => sum + p.count, 0);
    const avgDuration =
      Array.from(this.patterns.values()).reduce((sum, p) => sum + p.avgDuration, 0) /
      this.patterns.size;

    return {
      totalUniquePatterns: this.patterns.size,
      totalQueries,
      avgQueryDuration: Math.round(avgDuration * 100) / 100,
      nPlusOneCount: this.nPlusOnePatterns.length,
      slowQueryCount: this.slowQueries.length,
      requestsAnalyzed: this.requestAnalyses.length,
      mostAccessedTables: this.getMostAccessedTables(),
    };
  }

  /**
   * Identify top performance problems
   */
  identifyTopProblems() {
    const problems = [];

    // High-frequency patterns that might be N+1
    Array.from(this.patterns.values())
      .filter(p => p.count >= 10)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach(pattern => {
        const severity = pattern.count > 50 ? 'HIGH' : pattern.count > 20 ? 'MEDIUM' : 'LOW';
        problems.push({
          type: 'FREQUENT_PATTERN',
          severity,
          pattern: pattern.normalizedQuery.substring(0, 100),
          count: pattern.count,
          avgDuration: Math.round(pattern.avgDuration),
          totalTime: Math.round(pattern.totalDuration),
          tables: Array.from(pattern.tables),
          description: `Query executed ${pattern.count} times with average duration ${Math.round(
            pattern.avgDuration
          )}ms`,
        });
      });

    // Slow individual queries
    this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .forEach(query => {
        const severity = query.duration > 1000 ? 'HIGH' : query.duration > 500 ? 'MEDIUM' : 'LOW';
        problems.push({
          type: 'SLOW_QUERY',
          severity,
          pattern: query.query.substring(0, 100),
          duration: query.duration,
          queryId: query.queryId,
          description: `Slow query took ${query.duration}ms to execute`,
        });
      });

    // Confirmed N+1 patterns
    this.nPlusOnePatterns.forEach(pattern => {
      problems.push({
        type: 'N_PLUS_ONE',
        severity: 'HIGH',
        pattern: pattern.pattern.substring(0, 100),
        count: pattern.count,
        timeWindow: pattern.timeWindow,
        tables: pattern.tables,
        description: `N+1 pattern: ${pattern.count} similar queries in ${pattern.timeWindow}ms`,
      });
    });

    return problems.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Analyze N+1 patterns in detail
   */
  analyzeNPlusOnePatterns() {
    if (this.nPlusOnePatterns.length === 0) {
      return { count: 0, patterns: [], recommendations: [] };
    }

    const analysis = {
      count: this.nPlusOnePatterns.length,
      patterns: this.nPlusOnePatterns.map(p => ({
        pattern: p.pattern,
        occurrences: p.count,
        tables: p.tables,
        avgTimeWindow: p.timeWindow,
        impact: this.calculateNPlusOneImpact(p),
      })),
      recommendations: this.generateNPlusOneRecommendations(),
    };

    return analysis;
  }

  /**
   * Analyze slow queries in detail
   */
  analyzeSlowQueries() {
    if (this.slowQueries.length === 0) {
      return { count: 0, queries: [], recommendations: [] };
    }

    const grouped = new Map();
    this.slowQueries.forEach(query => {
      const normalized = this.normalizeQuery(query.query);
      if (!grouped.has(normalized)) {
        grouped.set(normalized, []);
      }
      grouped.get(normalized).push(query);
    });

    const analysis = {
      count: this.slowQueries.length,
      uniquePatterns: grouped.size,
      topSlowQueries: Array.from(grouped.entries())
        .map(([pattern, queries]) => ({
          pattern: pattern.substring(0, 150),
          count: queries.length,
          avgDuration: queries.reduce((sum, q) => sum + q.duration, 0) / queries.length,
          maxDuration: Math.max(...queries.map(q => q.duration)),
          totalTime: queries.reduce((sum, q) => sum + q.duration, 0),
        }))
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 10),
      recommendations: this.generateSlowQueryRecommendations(),
    };

    return analysis;
  }

  /**
   * Analyze request patterns
   */
  analyzeRequests() {
    if (this.requestAnalyses.length === 0) {
      return { count: 0, analysis: [], recommendations: [] };
    }

    const totalRequests = this.requestAnalyses.length;
    const requestsWithNPlusOne = this.requestAnalyses.filter(
      r => r.nPlusOnePatterns.length > 0
    ).length;
    const requestsWithDuplicates = this.requestAnalyses.filter(
      r => r.duplicateQueries.length > 0
    ).length;
    const requestsWithSlowQueries = this.requestAnalyses.filter(
      r => r.slowQueries.length > 0
    ).length;

    const avgQueriesPerRequest =
      this.requestAnalyses.reduce((sum, r) => sum + r.totalQueries, 0) / totalRequests;
    const avgDurationPerRequest =
      this.requestAnalyses.reduce((sum, r) => sum + r.totalDuration, 0) / totalRequests;

    return {
      count: totalRequests,
      summary: {
        avgQueriesPerRequest: Math.round(avgQueriesPerRequest * 100) / 100,
        avgDurationPerRequest: Math.round(avgDurationPerRequest),
        requestsWithNPlusOne,
        requestsWithDuplicates,
        requestsWithSlowQueries,
        percentageWithIssues: Math.round(
          ((requestsWithNPlusOne + requestsWithDuplicates + requestsWithSlowQueries) /
            totalRequests) *
            100
        ),
      },
      worstRequests: this.requestAnalyses
        .sort((a, b) => b.totalDuration - a.totalDuration)
        .slice(0, 10)
        .map(r => ({
          requestId: r.requestId,
          totalQueries: r.totalQueries,
          totalDuration: r.totalDuration,
          nPlusOneCount: r.nPlusOnePatterns.length,
          duplicateCount: r.duplicateQueries.length,
          slowQueryCount: r.slowQueries.length,
        })),
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations() {
    const recommendations = [];

    // N+1 recommendations
    if (this.nPlusOnePatterns.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'N+1 Queries',
        issue: `Found ${this.nPlusOnePatterns.length} N+1 query patterns`,
        solution: 'Implement eager loading or batch queries to reduce database round trips',
        examples: [
          'Use JOIN statements to fetch related data in single query',
          'Implement DataLoader pattern for batching',
          'Use ORM eager loading features',
          'Consider GraphQL DataLoader for API endpoints',
        ],
      });
    }

    // Frequent pattern recommendations
    const frequentPatterns = Array.from(this.patterns.values())
      .filter(p => p.count >= 20)
      .sort((a, b) => b.count - a.count);

    if (frequentPatterns.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Frequent Queries',
        issue: `${frequentPatterns.length} query patterns executed more than 20 times`,
        solution: 'Consider caching or query optimization for frequently executed queries',
        examples: [
          'Implement Redis caching for repeated SELECT queries',
          'Use materialized views for complex aggregations',
          'Add database indexes for WHERE clauses',
          'Consider query result memoization',
        ],
      });
    }

    // Slow query recommendations
    if (this.slowQueries.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Slow Queries',
        issue: `Found ${this.slowQueries.length} slow queries (>200ms)`,
        solution: 'Optimize slow queries with proper indexing and query restructuring',
        examples: [
          'Add indexes on WHERE, JOIN, and ORDER BY columns',
          'Use EXPLAIN ANALYZE to identify bottlenecks',
          'Consider query rewriting or breaking into smaller queries',
          'Review and optimize complex JOINs',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Get top query patterns
   */
  getTopPatterns(limit = 20) {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(p => ({
        queryHash: p.queryHash,
        pattern: p.normalizedQuery.substring(0, 150),
        count: p.count,
        avgDuration: Math.round(p.avgDuration),
        totalTime: Math.round(p.totalDuration),
        tables: Array.from(p.tables),
        uniqueRequests: p.requestIds.size,
      }));
  }

  /**
   * Get most accessed tables
   */
  getMostAccessedTables() {
    const tableCounts = new Map();

    Array.from(this.patterns.values()).forEach(pattern => {
      pattern.tables.forEach(table => {
        tableCounts.set(table, (tableCounts.get(table) || 0) + pattern.count);
      });
    });

    return Array.from(tableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([table, count]) => ({ table, accessCount: count }));
  }

  /**
   * Calculate N+1 impact
   */
  calculateNPlusOneImpact(pattern) {
    const estimatedSavings = (pattern.count - 1) * 2; // Assume 2ms per saved round trip
    return {
      estimatedSavingsMs: estimatedSavings,
      severity: pattern.count > 20 ? 'CRITICAL' : pattern.count > 10 ? 'HIGH' : 'MEDIUM',
    };
  }

  /**
   * Generate N+1 specific recommendations
   */
  generateNPlusOneRecommendations() {
    return [
      'Implement eager loading with JOIN statements',
      'Use DataLoader pattern for GraphQL resolvers',
      'Batch similar queries using SQL unions',
      'Consider ORM-specific eager loading features',
      'Implement proper pagination to limit data fetching',
    ];
  }

  /**
   * Generate slow query recommendations
   */
  generateSlowQueryRecommendations() {
    return [
      'Add database indexes on frequently filtered columns',
      'Use EXPLAIN ANALYZE to identify query bottlenecks',
      'Consider breaking complex queries into simpler ones',
      'Optimize JOIN operations and WHERE clauses',
      'Review and update table statistics',
    ];
  }

  /**
   * Normalize query for pattern matching
   */
  normalizeQuery(query) {
    return query
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/'[^']*'/g, "'?'")
      .replace(/\b\d+\b/g, '?')
      .replace(/\$\d+/g, '$?')
      .toLowerCase();
  }

  /**
   * Generate and save HTML report
   */
  async generateHTMLReport(report, outputPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Query Pattern Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .problem { margin: 10px 0; padding: 15px; border-radius: 5px; }
        .problem.HIGH { background: #ffebee; border-left: 4px solid #f44336; }
        .problem.MEDIUM { background: #fff3e0; border-left: 4px solid #ff9800; }
        .problem.LOW { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .pattern { font-family: monospace; background: #f5f5f5; padding: 5px; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
        .recommendations { background: #e3f2fd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Query Pattern Analysis Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
    </div>

    <div class="section">
        <h2>📊 Summary</h2>
        <div class="metric">
            <strong>Total Unique Patterns:</strong> ${report.summary.totalUniquePatterns}
        </div>
        <div class="metric">
            <strong>Total Queries:</strong> ${report.summary.totalQueries}
        </div>
        <div class="metric">
            <strong>Avg Duration:</strong> ${report.summary.avgQueryDuration}ms
        </div>
        <div class="metric">
            <strong>N+1 Patterns:</strong> ${report.summary.nPlusOneCount}
        </div>
        <div class="metric">
            <strong>Slow Queries:</strong> ${report.summary.slowQueryCount}
        </div>
    </div>

    <div class="section">
        <h2>🚨 Top Problems</h2>
        ${report.topProblems
          .map(
            problem => `
            <div class="problem ${problem.severity}">
                <h3>${problem.type} - ${problem.severity}</h3>
                <p><strong>Description:</strong> ${problem.description}</p>
                <div class="pattern">${problem.pattern}</div>
                ${problem.count ? `<p><strong>Count:</strong> ${problem.count}</p>` : ''}
                ${problem.duration ? `<p><strong>Duration:</strong> ${problem.duration}ms</p>` : ''}
                ${
                  problem.tables
                    ? `<p><strong>Tables:</strong> ${problem.tables.join(', ')}</p>`
                    : ''
                }
            </div>
        `
          )
          .join('')}
    </div>

    <div class="section">
        <h2>🔄 N+1 Analysis</h2>
        <p>Found ${report.nPlusOneAnalysis.count} N+1 patterns</p>
        ${report.nPlusOneAnalysis.patterns
          .map(
            pattern => `
            <div class="problem HIGH">
                <div class="pattern">${pattern.pattern}</div>
                <p><strong>Occurrences:</strong> ${pattern.occurrences}</p>
                <p><strong>Tables:</strong> ${pattern.tables.join(', ')}</p>
                <p><strong>Impact:</strong> ${pattern.impact.severity} - Could save ~${
              pattern.impact.estimatedSavingsMs
            }ms</p>
            </div>
        `
          )
          .join('')}
    </div>

    <div class="section">
        <h2>🐌 Slow Query Analysis</h2>
        <p>Found ${report.slowQueryAnalysis.count} slow queries across ${
      report.slowQueryAnalysis.uniquePatterns
    } unique patterns</p>
        <table>
            <tr>
                <th>Pattern</th>
                <th>Count</th>
                <th>Avg Duration (ms)</th>
                <th>Max Duration (ms)</th>
                <th>Total Time (ms)</th>
            </tr>
            ${(report.slowQueryAnalysis.topSlowQueries || [])
              .map(
                query => `
                <tr>
                    <td class="pattern">${query.pattern}</td>
                    <td>${query.count}</td>
                    <td>${Math.round(query.avgDuration)}</td>
                    <td>${query.maxDuration}</td>
                    <td>${Math.round(query.totalTime)}</td>
                </tr>
            `
              )
              .join('')}
        </table>
    </div>

    <div class="section">
        <h2>📋 Recommendations</h2>
        <div class="recommendations">
            ${report.recommendations
              .map(
                rec => `
                <div style="margin-bottom: 20px;">
                    <h3>${rec.priority} Priority: ${rec.category}</h3>
                    <p><strong>Issue:</strong> ${rec.issue}</p>
                    <p><strong>Solution:</strong> ${rec.solution}</p>
                    <ul>
                        ${rec.examples.map(example => `<li>${example}</li>`).join('')}
                    </ul>
                </div>
            `
              )
              .join('')}
        </div>
    </div>

    <div class="section">
        <h2>📈 Top Query Patterns</h2>
        <table>
            <tr>
                <th>Pattern</th>
                <th>Count</th>
                <th>Avg Duration (ms)</th>
                <th>Total Time (ms)</th>
                <th>Tables</th>
                <th>Unique Requests</th>
            </tr>
            ${report.patterns
              .slice(0, 20)
              .map(
                pattern => `
                <tr>
                    <td class="pattern">${pattern.pattern}</td>
                    <td>${pattern.count}</td>
                    <td>${pattern.avgDuration}</td>
                    <td>${pattern.totalTime}</td>
                    <td>${pattern.tables.join(', ')}</td>
                    <td>${pattern.uniqueRequests}</td>
                </tr>
            `
              )
              .join('')}
        </table>
    </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
    console.log(`📄 HTML report saved to: ${outputPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const date = args[0] || new Date().toISOString().split('T')[0];
  const outputFormat = args[1] || 'console'; // console, json, html

  const logsDir = path.join(__dirname, '..', 'logs');
  const analyzer = new QueryPatternAnalyzer(logsDir);

  try {
    const report = await analyzer.analyzeDate(date);

    if (outputFormat === 'json') {
      const outputPath = path.join(logsDir, `analysis-report-${date}.json`);
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`📄 JSON report saved to: ${outputPath}`);
    } else if (outputFormat === 'html') {
      const outputPath = path.join(logsDir, `analysis-report-${date}.html`);
      await analyzer.generateHTMLReport(report, outputPath);
    } else {
      // Console output
      console.log('\n📊 QUERY PATTERN ANALYSIS REPORT');
      console.log('='.repeat(50));

      console.log('\n📈 SUMMARY:');
      console.log(`• Total Unique Patterns: ${report.summary.totalUniquePatterns}`);
      console.log(`• Total Queries: ${report.summary.totalQueries}`);
      console.log(`• Average Duration: ${report.summary.avgQueryDuration}ms`);
      console.log(`• N+1 Patterns: ${report.summary.nPlusOneCount}`);
      console.log(`• Slow Queries: ${report.summary.slowQueryCount}`);

      console.log('\n🚨 TOP PROBLEMS:');
      report.topProblems.slice(0, 10).forEach((problem, i) => {
        console.log(`${i + 1}. [${problem.severity}] ${problem.type}`);
        console.log(`   ${problem.description}`);
        console.log(`   Pattern: ${problem.pattern.substring(0, 80)}...`);
        console.log('');
      });

      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`   Issue: ${rec.issue}`);
        console.log(`   Solution: ${rec.solution}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = QueryPatternAnalyzer;

// Run as CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}
