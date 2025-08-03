const fs = require('fs');
const path = require('path');

class SlowQueryAnalyzer {
  constructor() {
    this.logsDir = path.join(__dirname, '..', 'logs');
  }

  /**
   * Parse slow query logs for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Array} Array of slow query entries
   */
  async parseSlowQueryLogs(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `slow-queries-${targetDate}.jsonl`);

    if (!fs.existsSync(logFile)) {
      console.log(`No slow query log found for date: ${targetDate}`);
      return [];
    }

    try {
      const content = await fs.promises.readFile(logFile, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      return lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            console.error('Failed to parse log line:', line);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.error(`Failed to read slow query log: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze slow queries and generate summary report
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Analysis summary
   */
  async analyzeSlowQueries(date = null) {
    const queries = await this.parseSlowQueryLogs(date);

    if (queries.length === 0) {
      return {
        date: date || new Date().toISOString().split('T')[0],
        totalSlowQueries: 0,
        summary: 'No slow queries found for this date.',
      };
    }

    // Group queries by normalized text
    const queryGroups = {};
    let totalDuration = 0;
    let maxDuration = 0;
    let minDuration = Infinity;
    const errorQueries = [];

    queries.forEach(query => {
      // Normalize query text for grouping (remove parameters)
      const normalizedQuery = this.normalizeQuery(query.query);

      if (!queryGroups[normalizedQuery]) {
        queryGroups[normalizedQuery] = {
          query: normalizedQuery,
          originalQuery: query.query,
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          minDuration: Infinity,
          avgDuration: 0,
          examples: [],
        };
      }

      const group = queryGroups[normalizedQuery];
      group.count++;
      group.totalDuration += query.duration;
      group.maxDuration = Math.max(group.maxDuration, query.duration);
      group.minDuration = Math.min(group.minDuration, query.duration);
      group.avgDuration = group.totalDuration / group.count;

      // Keep up to 3 examples
      if (group.examples.length < 3) {
        group.examples.push({
          queryId: query.queryId,
          duration: query.duration,
          params: query.params,
          timestamp: query.timestamp,
          rowCount: query.rowCount,
        });
      }

      totalDuration += query.duration;
      maxDuration = Math.max(maxDuration, query.duration);
      minDuration = Math.min(minDuration, query.duration);

      if (query.error) {
        errorQueries.push(query);
      }
    });

    // Sort query groups by total duration (impact)
    const sortedGroups = Object.values(queryGroups).sort(
      (a, b) => b.totalDuration - a.totalDuration
    );

    return {
      date: date || new Date().toISOString().split('T')[0],
      totalSlowQueries: queries.length,
      uniqueQueryPatterns: Object.keys(queryGroups).length,
      totalDuration: Math.round(totalDuration),
      avgDuration: Math.round(totalDuration / queries.length),
      maxDuration: Math.round(maxDuration),
      minDuration: Math.round(minDuration),
      errorCount: errorQueries.length,
      topSlowQueries: sortedGroups.slice(0, 10),
      errors: errorQueries,
      recommendations: this.generateRecommendations(sortedGroups),
    };
  }

  /**
   * Normalize query text for grouping
   * @param {string} query - Original query text
   * @returns {string} Normalized query
   */
  normalizeQuery(query) {
    return (
      query
        // Replace parameter placeholders with generic markers
        .replace(/\$\d+/g, '$?')
        // Replace quoted strings with placeholder
        .replace(/'[^']*'/g, "'?'")
        // Replace numbers with placeholder
        .replace(/\b\d+\b/g, '?')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    );
  }

  /**
   * Generate performance recommendations based on slow queries
   * @param {Array} queryGroups - Sorted query groups
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(queryGroups) {
    const recommendations = [];

    queryGroups.slice(0, 5).forEach((group, index) => {
      const query = group.originalQuery.toLowerCase();

      // Check for common performance issues
      if (query.includes('select *')) {
        recommendations.push({
          priority: 'HIGH',
          type: 'SELECT_OPTIMIZATION',
          query: group.query,
          issue: 'Using SELECT * instead of specific columns',
          suggestion:
            'Specify only the columns you need to reduce data transfer and improve performance',
        });
      }

      if (query.includes("like '%") && query.includes("%'")) {
        recommendations.push({
          priority: 'HIGH',
          type: 'INDEX_OPTIMIZATION',
          query: group.query,
          issue: 'Using LIKE with leading wildcard',
          suggestion:
            'Consider using full-text search or reorganizing the query to avoid leading wildcards',
        });
      }

      if (!query.includes('where') && (query.includes('update') || query.includes('delete'))) {
        recommendations.push({
          priority: 'CRITICAL',
          type: 'SAFETY_ISSUE',
          query: group.query,
          issue: 'UPDATE/DELETE without WHERE clause',
          suggestion: 'Always use WHERE clause with UPDATE/DELETE to avoid modifying all rows',
        });
      }

      if (query.includes('join') && !query.includes('where')) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'JOIN_OPTIMIZATION',
          query: group.query,
          issue: 'JOIN without WHERE clause may produce large result sets',
          suggestion: 'Add appropriate WHERE conditions to limit the result set',
        });
      }

      if (query.includes('order by') && !query.includes('limit')) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'RESULT_SET_OPTIMIZATION',
          query: group.query,
          issue: 'ORDER BY without LIMIT may sort large result sets unnecessarily',
          suggestion: 'Consider adding LIMIT clause if you only need top results',
        });
      }

      if (group.avgDuration > 1000) {
        recommendations.push({
          priority: 'HIGH',
          type: 'GENERAL_PERFORMANCE',
          query: group.query,
          issue: `Very slow query (avg: ${Math.round(group.avgDuration)}ms)`,
          suggestion:
            'Consider adding indexes, optimizing query structure, or breaking into smaller operations',
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate a detailed report
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {string} Formatted report
   */
  async generateReport(date = null) {
    const analysis = await this.analyzeSlowQueries(date);

    let report = `
=== SLOW QUERY ANALYSIS REPORT ===
Date: ${analysis.date}
Generated: ${new Date().toISOString()}

SUMMARY:
- Total Slow Queries: ${analysis.totalSlowQueries}
- Unique Query Patterns: ${analysis.uniqueQueryPatterns}
- Total Duration: ${analysis.totalDuration}ms
- Average Duration: ${analysis.avgDuration}ms
- Max Duration: ${analysis.maxDuration}ms
- Min Duration: ${analysis.minDuration}ms
- Error Count: ${analysis.errorCount}

`;

    if (analysis.totalSlowQueries === 0) {
      report += 'No slow queries found for this date.\n';
      return report;
    }

    report += `
TOP SLOW QUERY PATTERNS (by total impact):
${'='.repeat(50)}
`;

    analysis.topSlowQueries.forEach((group, index) => {
      report += `
${index + 1}. Query Pattern:
   ${group.query}
   
   Statistics:
   - Occurrences: ${group.count}
   - Total Duration: ${Math.round(group.totalDuration)}ms
   - Average Duration: ${Math.round(group.avgDuration)}ms
   - Max Duration: ${Math.round(group.maxDuration)}ms
   - Min Duration: ${Math.round(group.minDuration)}ms
   
   Recent Examples:
`;

      group.examples.forEach((example, exIndex) => {
        report += `   ${exIndex + 1}. ${example.timestamp} - ${example.duration}ms (${
          example.rowCount || 0
        } rows)\n`;
        if (example.params && example.params.length > 0) {
          report += `      Params: ${JSON.stringify(example.params)}\n`;
        }
      });

      report += '\n';
    });

    if (analysis.recommendations.length > 0) {
      report += `
PERFORMANCE RECOMMENDATIONS:
${'='.repeat(30)}
`;

      analysis.recommendations.forEach((rec, index) => {
        report += `
${index + 1}. [${rec.priority}] ${rec.type}
   Issue: ${rec.issue}
   Suggestion: ${rec.suggestion}
   Query: ${rec.query}
`;
      });
    }

    if (analysis.errorCount > 0) {
      report += `
ERRORS ENCOUNTERED:
${'='.repeat(20)}
`;

      analysis.errors.forEach((error, index) => {
        report += `
${index + 1}. ${error.timestamp} - Query ID: ${error.queryId}
   Duration: ${error.duration}ms
   Error: ${error.error}
   Query: ${error.query}
`;
        if (error.params) {
          report += `   Params: ${JSON.stringify(error.params)}\n`;
        }
      });
    }

    return report;
  }

  /**
   * List available log dates
   * @returns {Array} Array of dates with logs
   */
  async getAvailableLogDates() {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const dates = files
        .filter(file => file.startsWith('slow-queries-') && file.endsWith('.jsonl'))
        .map(file => file.replace('slow-queries-', '').replace('.jsonl', ''))
        .sort()
        .reverse();

      return dates;
    } catch (error) {
      console.error('Failed to read logs directory:', error.message);
      return [];
    }
  }

  /**
   * Clean up old log files (older than specified days)
   * @param {number} daysToKeep - Number of days to keep logs
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedFiles = [];

      for (const file of files) {
        if (file.startsWith('slow-queries-') || file.startsWith('explain-analyze-')) {
          const match = file.match(/(\d{4}-\d{2}-\d{2})/);
          if (match) {
            const fileDate = new Date(match[1]);
            if (fileDate < cutoffDate) {
              await fs.promises.unlink(path.join(this.logsDir, file));
              deletedFiles.push(file);
            }
          }
        }
      }

      console.log(`Cleaned up ${deletedFiles.length} old log files`);
      return deletedFiles;
    } catch (error) {
      console.error('Failed to cleanup old logs:', error.message);
      return [];
    }
  }
}

module.exports = SlowQueryAnalyzer;
