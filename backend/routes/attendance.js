const express = require('express');
const moment = require('moment');
const { auth } = require('../middleware/auth');
const pool = require('../config/database');

// Import cache middleware
const {
  attendanceStatsCache,
  attendanceCalendarCache,
  invalidateCacheMiddleware,
  invalidateAttendanceCache,
  invalidateUserCache,
  rateLimitMiddleware,
  cacheMiddleware
} = require('../middleware/cache');
const { CacheKeys } = require('../config/redis');

const router = express.Router();

// Get user's attendance records
router.get('/records', 
  auth, 
  cacheMiddleware((req) => {
    const userId = req.user?.id;
    const startDate = req.query?.startDate || '';
    const endDate = req.query?.endDate || '';
    const page = req.query?.page || 1;
    return CacheKeys.attendanceRecords(userId, startDate, endDate, page);
  }, 1800), // 30 minutes cache
  async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ar.*, 
             EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in))/3600 as calculated_hours
      FROM attendance_records ar 
      WHERE ar.user_id = $1
    `;
    const params = [req.user.id];

    if (startDate && endDate) {
      query += ` AND ar.date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY ar.date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM attendance_records WHERE user_id = $1';
    const countParams = [req.user.id];

    if (startDate && endDate) {
      countQuery += ' AND date BETWEEN $2 AND $3';
      countParams.push(startDate, endDate);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      records: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance statistics
router.get('/stats', auth, attendanceStatsCache(1800), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = moment().subtract(period, 'days').format('YYYY-MM-DD');

    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'present') as present_days,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'late') as late_days,
        COUNT(*) FILTER (WHERE status = 'early_leave') as early_leave_days,
        AVG(hours_worked) FILTER (WHERE hours_worked > 0) as avg_hours,
        SUM(hours_worked) as total_hours
      FROM attendance_records 
      WHERE user_id = $1 AND date >= $2
    `;

    const statsResult = await pool.query(statsQuery, [req.user.id, startDate]);
    const stats = statsResult.rows[0];

    // Get earliest and latest clock-in/out times
    const timesQuery = `
      SELECT 
        MIN(clock_in) as earliest_clock_in,
        MAX(clock_in) as latest_clock_in,
        MIN(clock_out) as earliest_clock_out,
        MAX(clock_out) as latest_clock_out
      FROM attendance_records 
      WHERE user_id = $1 AND date >= $2 AND clock_in IS NOT NULL
    `;

    const timesResult = await pool.query(timesQuery, [req.user.id, startDate]);
    const times = timesResult.rows[0];

    // Get monthly breakdown
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', date) as month,
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'present') as present_days,
        AVG(hours_worked) FILTER (WHERE hours_worked > 0) as avg_hours
      FROM attendance_records 
      WHERE user_id = $1 AND date >= $2
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `;

    const monthlyResult = await pool.query(monthlyQuery, [req.user.id, startDate]);

    res.json({
      summary: {
        totalRecords: parseInt(stats.total_records),
        presentDays: parseInt(stats.present_days),
        absentDays: parseInt(stats.absent_days),
        lateDays: parseInt(stats.late_days),
        earlyLeaveDays: parseInt(stats.early_leave_days),
        averageHours: parseFloat(stats.avg_hours || 0).toFixed(2),
        totalHours: parseFloat(stats.total_hours || 0).toFixed(2)
      },
      times: {
        earliestClockIn: times.earliest_clock_in,
        latestClockIn: times.latest_clock_in,
        earliestClockOut: times.earliest_clock_out,
        latestClockOut: times.latest_clock_out
      },
      monthly: monthlyResult.rows
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get calendar data
router.get('/calendar', 
  auth, 
  attendanceCalendarCache(1800), // 30 minutes cache with force bypass support
  async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let startDate, endDate;
    if (month && year) {
      startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
      endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    } else {
      // Default to current month
      startDate = moment().startOf('month').format('YYYY-MM-DD');
      endDate = moment().endOf('month').format('YYYY-MM-DD');
    }

    const result = await pool.query(
      `SELECT date, clock_in, clock_out, hours_worked, status, notes 
       FROM attendance_records 
       WHERE user_id = $1 AND date BETWEEN $2 AND $3
       ORDER BY date`,
      [req.user.id, startDate, endDate]
    );

    res.json({
      period: { startDate, endDate },
      records: result.rows
    });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get holidays (for calendar highlighting)
router.get('/holidays', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM holidays ORDER BY date'
    );
    res.json({
      holidays: result.rows
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clock in/out (for future implementation)
router.post('/clock-in', 
  auth, 
  rateLimitMiddleware(30, 10 * 60 * 1000), // 30 requests per 10 minutes
  invalidateCacheMiddleware([
    (req) => CacheKeys.attendanceStats(req.user.id, '*'),
    (req) => CacheKeys.attendanceRecords(req.user.id, '*'),
    () => 'analytics:*'
  ]),
  async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const clockInTime = moment().format('HH:mm:ss');

    // Check if already clocked in today
    const existing = await pool.query(
      'SELECT id, clock_in FROM attendance_records WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].clock_in) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await pool.query(
        'UPDATE attendance_records SET clock_in = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [clockInTime, 'present', existing.rows[0].id]
      );
    } else {
      // Create new record
      result = await pool.query(
        'INSERT INTO attendance_records (user_id, date, clock_in, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, today, clockInTime, 'present']
      );
    }

    res.json({ message: 'Clocked in successfully', record: result.rows[0] });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/clock-out', 
  auth, 
  rateLimitMiddleware(30, 10 * 60 * 1000), // 30 requests per 10 minutes
  invalidateCacheMiddleware([
    (req) => CacheKeys.attendanceStats(req.user.id, '*'),
    (req) => CacheKeys.attendanceRecords(req.user.id, '*'),
    () => 'analytics:*'
  ]),
  async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const clockOutTime = moment().format('HH:mm:ss');

    // Find today's record
    const result = await pool.query(
      'SELECT id, clock_in FROM attendance_records WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    );

    if (result.rows.length === 0 || !result.rows[0].clock_in) {
      return res.status(400).json({ message: 'Must clock in first' });
    }

    const record = result.rows[0];
    const clockIn = moment(record.clock_in, 'HH:mm:ss');
    const clockOut = moment(clockOutTime, 'HH:mm:ss');
    const hoursWorked = clockOut.diff(clockIn, 'hours', true);

    // Update record with clock out
    const updateResult = await pool.query(
      'UPDATE attendance_records SET clock_out = $1, hours_worked = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [clockOutTime, hoursWorked.toFixed(2), record.id]
    );

    res.json({ message: 'Clocked out successfully', record: updateResult.rows[0] });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
