const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const pool = require('../config/database');
const { invalidateAttendanceCache } = require('../middleware/cache');

const router = express.Router();

/**
 * External Attendance Data API Integration
 * These endpoints handle attendance data from external systems (clock_in, clock_out, date, UserID)
 */

// ============================================================================
// EXTERNAL API ENDPOINTS (for receiving attendance data from external systems)
// ============================================================================

/**
 * POST /api/attendance-api/sync
 * Sync attendance data from external API
 * Expected payload: { records: [{ user_id, clock_in, clock_out, date }] }
 */
router.post('/sync', auth, adminAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting external attendance data sync...');
    
    const { records = [], source = 'external_api' } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty attendance records array'
      });
    }
    
    await client.query('BEGIN');
    
    const syncResults = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    for (const record of records) {
      try {
        const { user_id, clock_in, clock_out, date } = record;
        
        // Validate required fields
        if (!user_id || !clock_in || !date) {
          syncResults.errors.push({
            record: record,
            error: 'Missing required fields: user_id, clock_in, date'
          });
          syncResults.skipped++;
          continue;
        }
        
        // Validate user exists
        const userCheck = await client.query(
          'SELECT id FROM users WHERE id = $1',
          [user_id]
        );
        
        if (userCheck.rows.length === 0) {
          syncResults.errors.push({
            record: record,
            error: `User ID ${user_id} not found`
          });
          syncResults.skipped++;
          continue;
        }
        
        // Calculate hours worked if clock_out is provided
        let hoursWorked = null;
        let status = 'present';
        
        if (clock_out) {
          const clockInTime = new Date(`${date}T${clock_in}`);
          const clockOutTime = new Date(`${date}T${clock_out}`);
          hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60); // Convert to hours
        } else {
          status = 'partial'; // Clocked in but not out yet
        }
        
        // Check if record already exists for this user and date
        const existingRecord = await client.query(`
          SELECT id FROM attendance_records 
          WHERE user_id = $1 AND date = $2
        `, [user_id, date]);
        
        if (existingRecord.rows.length > 0) {
          // Update existing record
          await client.query(`
            UPDATE attendance_records 
            SET clock_in = $1, 
                clock_out = $2, 
                hours_worked = $3,
                status = $4,
                data_source = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6 AND date = $7
          `, [clock_in, clock_out, hoursWorked, status, source, user_id, date]);
          
          syncResults.updated++;
        } else {
          // Create new record
          await client.query(`
            INSERT INTO attendance_records 
            (user_id, date, clock_in, clock_out, hours_worked, status, data_source, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [user_id, date, clock_in, clock_out, hoursWorked, status, source]);
          
          syncResults.created++;
        }
        
        syncResults.processed++;
        
      } catch (recordError) {
        console.error('Error processing record:', recordError);
        syncResults.errors.push({
          record: record,
          error: recordError.message
        });
        syncResults.skipped++;
      }
    }
    
    await client.query('COMMIT');
    
    // Invalidate related caches
    await invalidateAttendanceCache();
    
    console.log(`✅ Attendance sync completed:`, syncResults);
    
    res.json({
      success: true,
      message: 'Attendance data synchronized successfully',
      results: syncResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Attendance sync error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync attendance data',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/attendance-api/real-time
 * Real-time attendance event (single clock-in/out)
 * Expected payload: { user_id, event_type: 'clock_in'|'clock_out', timestamp, location? }
 */
router.post('/real-time', auth, adminAuth, async (req, res) => {
  try {
    console.log('⚡ Processing real-time attendance event...');
    
    const { user_id, event_type, timestamp, location } = req.body;
    
    // Validate required fields
    if (!user_id || !event_type || !timestamp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, event_type, timestamp'
      });
    }
    
    if (!['clock_in', 'clock_out'].includes(event_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event_type. Must be "clock_in" or "clock_out"'
      });
    }
    
    // Validate user exists
    const userCheck = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User ID ${user_id} not found`
      });
    }
    
    const user = userCheck.rows[0];
    const eventDate = new Date(timestamp).toISOString().split('T')[0];
    const eventTime = new Date(timestamp).toTimeString().split(' ')[0];
    
    // Check for existing record today
    const existingRecord = await pool.query(`
      SELECT * FROM attendance_records 
      WHERE user_id = $1 AND date = $2
    `, [user_id, eventDate]);
    
    let result;
    
    if (existingRecord.rows.length > 0) {
      // Update existing record
      const record = existingRecord.rows[0];
      
      if (event_type === 'clock_in' && !record.clock_in) {
        // Set clock_in time
        result = await pool.query(`
          UPDATE attendance_records 
          SET clock_in = $1, status = 'present', updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2 AND date = $3
          RETURNING *
        `, [eventTime, user_id, eventDate]);
        
      } else if (event_type === 'clock_out' && record.clock_in && !record.clock_out) {
        // Set clock_out time and calculate hours
        const clockInTime = new Date(`${eventDate}T${record.clock_in}`);
        const clockOutTime = new Date(`${eventDate}T${eventTime}`);
        const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        
        result = await pool.query(`
          UPDATE attendance_records 
          SET clock_out = $1, hours_worked = $2, status = 'present', updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3 AND date = $4
          RETURNING *
        `, [eventTime, hoursWorked, user_id, eventDate]);
        
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid event: User has already ${event_type.replace('_', ' ')}ed today`,
          current_record: record
        });
      }
      
    } else if (event_type === 'clock_in') {
      // Create new record with clock_in
      result = await pool.query(`
        INSERT INTO attendance_records 
        (user_id, date, clock_in, status, data_source, created_at, updated_at)
        VALUES ($1, $2, $3, 'present', 'real_time_api', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [user_id, eventDate, eventTime]);
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cannot clock out without clocking in first'
      });
    }
    
    // Invalidate related caches
    await invalidateAttendanceCache();
    
    const attendanceRecord = result.rows[0];
    
    console.log(`✅ Real-time event processed: ${user.first_name} ${user.last_name} ${event_type} at ${eventTime}`);
    
    res.json({
      success: true,
      message: `${event_type.replace('_', ' ').toUpperCase()} recorded successfully`,
      data: {
        user: user,
        event_type: event_type,
        timestamp: timestamp,
        date: eventDate,
        time: eventTime,
        attendance_record: attendanceRecord
      }
    });
    
  } catch (error) {
    console.error('❌ Real-time attendance error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process real-time attendance event',
      error: error.message
    });
  }
});

// ============================================================================
// MANAGEMENT ENDPOINTS (for admin dashboard)
// ============================================================================

/**
 * GET /api/attendance-api/sources
 * Get attendance data sources and sync status
 */
router.get('/sources', auth, adminAuth, async (req, res) => {
  try {
    // Get data source statistics
    const sourceStats = await pool.query(`
      SELECT 
        data_source,
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        MAX(updated_at) as last_sync
      FROM attendance_records 
      WHERE data_source IS NOT NULL
      GROUP BY data_source
      ORDER BY total_records DESC
    `);
    
    // Get recent sync activities
    const recentSyncs = await pool.query(`
      SELECT DISTINCT 
        data_source,
        DATE(updated_at) as sync_date,
        COUNT(*) as records_synced
      FROM attendance_records 
      WHERE data_source IS NOT NULL 
        AND updated_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY data_source, DATE(updated_at)
      ORDER BY sync_date DESC, data_source
      LIMIT 50
    `);
    
    res.json({
      success: true,
      data: {
        sources: sourceStats.rows,
        recent_syncs: recentSyncs.rows,
        summary: {
          total_sources: sourceStats.rows.length,
          total_api_records: sourceStats.rows.reduce((sum, source) => sum + parseInt(source.total_records), 0)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching attendance sources:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data sources',
      error: error.message
    });
  }
});

/**
 * POST /api/attendance-api/manual-sync
 * Trigger manual sync with external attendance API
 */
router.post('/manual-sync', auth, adminAuth, async (req, res) => {
  try {
    const { api_url, date_range, authentication } = req.body;
    
    // This would integrate with your external attendance API
    // For now, we'll simulate the process
    
    console.log('🔄 Starting manual sync with external API...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      message: 'Manual sync initiated successfully',
      data: {
        sync_id: `sync_${Date.now()}`,
        status: 'in_progress',
        estimated_completion: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      }
    });
    
  } catch (error) {
    console.error('❌ Manual sync error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to initiate manual sync',
      error: error.message
    });
  }
});

/**
 * GET /api/attendance-api/conflicts
 * Get attendance data conflicts that need resolution
 */
router.get('/conflicts', auth, adminAuth, async (req, res) => {
  try {
    // Find potential conflicts (multiple records for same user/date from different sources)
    const conflicts = await pool.query(`
      SELECT 
        user_id,
        date,
        u.first_name,
        u.last_name,
        COUNT(*) as record_count,
        ARRAY_AGG(DISTINCT data_source) as sources,
        ARRAY_AGG(DISTINCT clock_in) as clock_in_times,
        ARRAY_AGG(DISTINCT clock_out) as clock_out_times
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE data_source IS NOT NULL
      GROUP BY user_id, date, u.first_name, u.last_name
      HAVING COUNT(*) > 1
      ORDER BY date DESC, u.last_name, u.first_name
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: {
        conflicts: conflicts.rows,
        count: conflicts.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching conflicts:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance conflicts',
      error: error.message
    });
  }
});

module.exports = router;