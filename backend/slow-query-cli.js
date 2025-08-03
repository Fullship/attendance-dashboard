#!/usr/bin/env node

const SlowQueryAnalyzer = require('./utils/slow-query-analyzer');
const pool = require('./config/database');

/**
 * CLI utility for PostgreSQL slow query analysis
 * Usage examples:
 *   node slow-query-cli.js report                    # Generate report for today
 *   node slow-query-cli.js report 2025-01-15        # Generate report for specific date
 *   node slow-query-cli.js stats                     # Show current query statistics
 *   node slow-query-cli.js list                      # List available log dates
 *   node slow-query-cli.js cleanup 30               # Cleanup logs older than 30 days
 *   node slow-query-cli.js watch                     # Watch for slow queries in real-time
 */

class SlowQueryCLI {
  constructor() {
    this.analyzer = new SlowQueryAnalyzer();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    try {
      switch (command) {
        case 'report':
          await this.generateReport(args[1]);
          break;
        case 'stats':
          await this.showStats();
          break;
        case 'list':
          await this.listLogs();
          break;
        case 'cleanup':
          await this.cleanup(parseInt(args[1]) || 30);
          break;
        case 'watch':
          await this.watchQueries();
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  async generateReport(date) {
    console.log('📊 Generating slow query analysis report...\n');

    const report = await this.analyzer.generateReport(date);
    console.log(report);

    // Also save report to file
    const fs = require('fs');
    const path = require('path');
    const reportDate = date || new Date().toISOString().split('T')[0];
    const reportFile = path.join(__dirname, 'logs', `slow-query-report-${reportDate}.txt`);

    try {
      await fs.promises.writeFile(reportFile, report);
      console.log(`\n📝 Report saved to: ${reportFile}`);
    } catch (error) {
      console.log(`\n⚠️  Could not save report to file: ${error.message}`);
    }
  }

  async showStats() {
    console.log('📈 Current Database Query Statistics:\n');

    if (typeof pool.getQueryStats === 'function') {
      const stats = pool.getQueryStats();

      console.log(`Total Queries: ${stats.totalQueries}`);
      console.log(`Slow Queries: ${stats.slowQueries} (${stats.slowQueryPercentage}%)`);
      console.log(`Average Duration: ${Math.round(stats.averageDuration)}ms`);
      console.log(`Total Duration: ${Math.round(stats.totalDuration)}ms`);
      console.log(`Uptime: ${Math.round(stats.uptime / 1000)}s`);
      console.log(`Last Reset: ${stats.lastReset.toISOString()}`);

      if (stats.slowQueries > 0) {
        console.log(`\n⚠️  You have ${stats.slowQueries} slow queries (>${200}ms)`);
        console.log('Run "node slow-query-cli.js report" for detailed analysis');
      } else {
        console.log('\n✅ No slow queries detected');
      }
    } else {
      console.log(
        'Query statistics not available. Make sure the enhanced database configuration is loaded.'
      );
    }
  }

  async listLogs() {
    console.log('📁 Available slow query log dates:\n');

    const dates = await this.analyzer.getAvailableLogDates();

    if (dates.length === 0) {
      console.log('No slow query logs found.');
      return;
    }

    dates.forEach((date, index) => {
      const isToday = date === new Date().toISOString().split('T')[0];
      console.log(`${index + 1}. ${date}${isToday ? ' (today)' : ''}`);
    });

    console.log(`\nUse "node slow-query-cli.js report <date>" to analyze a specific date.`);
  }

  async cleanup(days) {
    console.log(`🧹 Cleaning up log files older than ${days} days...\n`);

    const deletedFiles = await this.analyzer.cleanupOldLogs(days);

    if (deletedFiles.length === 0) {
      console.log('No old log files found to clean up.');
    } else {
      console.log(`Deleted ${deletedFiles.length} old log files:`);
      deletedFiles.forEach(file => console.log(`  - ${file}`));
    }
  }

  async watchQueries() {
    console.log('👀 Watching for slow queries in real-time...');
    console.log('Press Ctrl+C to stop\n');

    const fs = require('fs');
    const path = require('path');

    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(__dirname, 'logs', `slow-queries-${today}.jsonl`);

    let lastSize = 0;

    const checkForNewQueries = async () => {
      try {
        if (!fs.existsSync(logFile)) return;

        const stats = await fs.promises.stat(logFile);
        if (stats.size > lastSize) {
          const content = await fs.promises.readFile(logFile, 'utf8');
          const lines = content.trim().split('\n');

          // Process new lines
          const startIndex = Math.max(0, lines.length - Math.ceil((stats.size - lastSize) / 100));
          for (let i = startIndex; i < lines.length; i++) {
            try {
              const query = JSON.parse(lines[i]);
              this.displaySlowQuery(query);
            } catch (error) {
              // Skip malformed lines
            }
          }

          lastSize = stats.size;
        }
      } catch (error) {
        console.error('Error watching log file:', error.message);
      }
    };

    // Check for existing file size
    if (fs.existsSync(logFile)) {
      const stats = await fs.promises.stat(logFile);
      lastSize = stats.size;
    }

    // Watch for changes
    const interval = setInterval(checkForNewQueries, 1000);

    // Graceful shutdown
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n\n👋 Stopped watching for slow queries.');
      process.exit(0);
    });
  }

  displaySlowQuery(query) {
    const timestamp = new Date(query.timestamp).toLocaleTimeString();
    const duration = Math.round(query.duration);

    console.log(`🐌 [${timestamp}] Slow Query (${duration}ms) - ID: ${query.queryId}`);
    console.log(`   Query: ${query.query.substring(0, 80)}${query.query.length > 80 ? '...' : ''}`);

    if (query.params && query.params.length > 0) {
      console.log(`   Params: ${JSON.stringify(query.params)}`);
    }

    if (query.rowCount !== undefined) {
      console.log(`   Rows: ${query.rowCount}`);
    }

    if (query.error) {
      console.log(`   ❌ Error: ${query.error}`);
    }

    console.log('');
  }

  showHelp() {
    console.log(`
🔍 PostgreSQL Slow Query Analysis CLI

USAGE:
  node slow-query-cli.js <command> [options]

COMMANDS:
  report [date]     Generate detailed slow query analysis report
                    - date: Optional date in YYYY-MM-DD format (default: today)
                    
  stats             Show current database query statistics
  
  list              List all available log dates
  
  cleanup [days]    Clean up log files older than specified days
                    - days: Number of days to keep (default: 30)
                    
  watch             Watch for slow queries in real-time
  
  help              Show this help message

EXAMPLES:
  node slow-query-cli.js report                    # Today's report
  node slow-query-cli.js report 2025-01-15        # Specific date report
  node slow-query-cli.js stats                     # Current statistics
  node slow-query-cli.js cleanup 7                # Keep only 7 days of logs
  node slow-query-cli.js watch                     # Real-time monitoring

CONFIGURATION:
  Set environment variables to control logging:
  - ENABLE_QUERY_LOGGING=true         # Enable query logging
  - ENABLE_EXPLAIN_ANALYZE=true       # Enable EXPLAIN ANALYZE for slow queries
  - Slow query threshold: 200ms (hardcoded)

LOG FILES:
  - slow-queries-YYYY-MM-DD.jsonl     # Daily slow query logs
  - explain-analyze-YYYY-MM-DD.json   # EXPLAIN ANALYZE results
  - slow-query-report-YYYY-MM-DD.txt  # Generated reports
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new SlowQueryCLI();
  cli
    .run()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = SlowQueryCLI;
