const pool = require('../config/database');
const SlowQueryAnalyzer = require('../utils/slow-query-analyzer');

/**
 * Middleware to provide database performance monitoring endpoints
 */

class DatabaseMonitoringAPI {
  constructor() {
    this.analyzer = new SlowQueryAnalyzer();
  }

  /**
   * Get current query statistics
   */
  async getQueryStats(req, res) {
    try {
      if (typeof pool.getQueryStats !== 'function') {
        return res.status(500).json({
          error: 'Query statistics not available',
          message: 'Enhanced database configuration not loaded',
        });
      }

      const stats = pool.getQueryStats();

      res.json({
        success: true,
        data: {
          ...stats,
          thresholdMs: 200,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting query stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve query statistics',
        message: error.message,
      });
    }
  }

  /**
   * Reset query statistics
   */
  async resetQueryStats(req, res) {
    try {
      if (typeof pool.resetQueryStats !== 'function') {
        return res.status(500).json({
          error: 'Query statistics not available',
          message: 'Enhanced database configuration not loaded',
        });
      }

      pool.resetQueryStats();

      res.json({
        success: true,
        message: 'Query statistics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting query stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset query statistics',
        message: error.message,
      });
    }
  }

  /**
   * Get slow query analysis for a specific date
   */
  async getSlowQueryAnalysis(req, res) {
    try {
      const date = req.query.date || req.params.date;

      // Validate date format if provided
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format',
          message: 'Date must be in YYYY-MM-DD format',
        });
      }

      const analysis = await this.analyzer.analyzeSlowQueries(date);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error analyzing slow queries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze slow queries',
        message: error.message,
      });
    }
  }

  /**
   * Get available log dates
   */
  async getAvailableLogDates(req, res) {
    try {
      const dates = await this.analyzer.getAvailableLogDates();

      res.json({
        success: true,
        data: {
          dates,
          count: dates.length,
        },
      });
    } catch (error) {
      console.error('Error getting available log dates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available log dates',
        message: error.message,
      });
    }
  }

  /**
   * Get slow query report as text
   */
  async getSlowQueryReport(req, res) {
    try {
      const date = req.query.date || req.params.date;
      const format = req.query.format || 'text';

      // Validate date format if provided
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format',
          message: 'Date must be in YYYY-MM-DD format',
        });
      }

      if (format === 'json') {
        // Return structured analysis
        const analysis = await this.analyzer.analyzeSlowQueries(date);
        res.json({
          success: true,
          data: analysis,
        });
      } else {
        // Return formatted text report
        const report = await this.analyzer.generateReport(date);
        res.set('Content-Type', 'text/plain');
        res.send(report);
      }
    } catch (error) {
      console.error('Error generating slow query report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate slow query report',
        message: error.message,
      });
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs(req, res) {
    try {
      const days = parseInt(req.body.days || req.query.days) || 30;

      if (days < 1 || days > 365) {
        return res.status(400).json({
          success: false,
          error: 'Invalid days parameter',
          message: 'Days must be between 1 and 365',
        });
      }

      const deletedFiles = await this.analyzer.cleanupOldLogs(days);

      res.json({
        success: true,
        data: {
          deletedFiles,
          count: deletedFiles.length,
          daysKept: days,
        },
        message: `Cleaned up ${deletedFiles.length} old log files`,
      });
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old logs',
        message: error.message,
      });
    }
  }

  /**
   * Get database connection pool stats
   */
  async getPoolStats(req, res) {
    try {
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        config: {
          max: pool.options.max,
          min: pool.options.min,
          idleTimeoutMillis: pool.options.idleTimeoutMillis,
          connectionTimeoutMillis: pool.options.connectionTimeoutMillis,
        },
      };

      res.json({
        success: true,
        data: poolStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting pool stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pool statistics',
        message: error.message,
      });
    }
  }

  /**
   * Health check endpoint for database monitoring
   */
  async healthCheck(req, res) {
    try {
      const start = Date.now();

      // Test database connection with a simple query
      const result = await pool.query('SELECT 1 as health_check, NOW() as server_time');
      const latency = Date.now() - start;

      const stats = typeof pool.getQueryStats === 'function' ? pool.getQueryStats() : null;

      res.json({
        success: true,
        data: {
          status: 'healthy',
          latency: latency,
          serverTime: result.rows[0].server_time,
          queryStats: stats,
          poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Database health check failed:', error);
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Setup routes for database monitoring
   */
  setupRoutes(app, basePath = '/api/admin/db-monitor') {
    // Query statistics
    app.get(`${basePath}/stats`, this.getQueryStats.bind(this));
    app.post(`${basePath}/stats/reset`, this.resetQueryStats.bind(this));

    // Slow query analysis
    app.get(`${basePath}/slow-queries`, this.getSlowQueryAnalysis.bind(this));
    app.get(`${basePath}/slow-queries/:date`, this.getSlowQueryAnalysis.bind(this));
    app.get(`${basePath}/slow-queries/:date/report`, this.getSlowQueryReport.bind(this));
    app.get(`${basePath}/report`, this.getSlowQueryReport.bind(this));

    // Log management
    app.get(`${basePath}/logs/dates`, this.getAvailableLogDates.bind(this));
    app.post(`${basePath}/logs/cleanup`, this.cleanupOldLogs.bind(this));

    // Pool statistics
    app.get(`${basePath}/pool`, this.getPoolStats.bind(this));

    // Health check
    app.get(`${basePath}/health`, this.healthCheck.bind(this));

    console.log(`📊 Database monitoring API endpoints registered at ${basePath}`);
  }
}

module.exports = DatabaseMonitoringAPI;
