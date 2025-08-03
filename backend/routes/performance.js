const express = require('express');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Query Performance Dashboard Routes
 */

// Get real-time query statistics
router.get('/query-stats', auth, adminAuth, (req, res) => {
  try {
    const stats = pool.getQueryStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting query stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top query patterns from logger
router.get('/query-patterns', auth, adminAuth, (req, res) => {
  try {
    const queryLogger = pool.getQueryLogger();
    const stats = queryLogger.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting query patterns:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset query statistics
router.post('/reset-stats', auth, adminAuth, (req, res) => {
  try {
    pool.resetQueryStats();
    res.json({ message: 'Query statistics reset successfully' });
  } catch (error) {
    console.error('Error resetting query stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate query analysis report
router.get('/analysis-report/:date?', auth, adminAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const QueryPatternAnalyzer = require('../scripts/analyze-query-patterns');
    const analyzer = new QueryPatternAnalyzer();

    const report = await analyzer.analyzeDate(targetDate);
    res.json(report);
  } catch (error) {
    console.error('Error generating analysis report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available log files
router.get('/log-files', auth, adminAuth, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const logsDir = path.join(__dirname, '..', 'logs');

    const files = await fs.readdir(logsDir);
    const logFiles = files
      .filter(file => file.endsWith('.jsonl'))
      .map(file => {
        const [type, date] = file.replace('.jsonl', '').split('-').slice(-2);
        return {
          filename: file,
          type: file.split('-')[0],
          date: date || 'unknown',
          path: `/api/performance/logs/${file}`,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({ files: logFiles });
  } catch (error) {
    console.error('Error listing log files:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download specific log file
router.get('/logs/:filename', auth, adminAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');

    // Validate filename to prevent directory traversal
    if (!/^[a-zA-Z0-9\-_.]+\.jsonl$/.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const logFile = path.join(__dirname, '..', 'logs', filename);

    // Check if file exists
    if (!fs.existsSync(logFile)) {
      return res.status(404).json({ message: 'Log file not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(logFile);
    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading log file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Live query monitoring endpoint (Server-Sent Events)
router.get('/live-queries', auth, adminAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial stats
  const sendStats = () => {
    try {
      const stats = pool.getQueryStats();
      res.write(`data: ${JSON.stringify(stats)}\n\n`);
    } catch (error) {
      console.error('Error sending live stats:', error);
    }
  };

  // Send stats immediately
  sendStats();

  // Send stats every 5 seconds
  const interval = setInterval(sendStats, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });

  req.on('end', () => {
    clearInterval(interval);
  });
});

module.exports = router;
