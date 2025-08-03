const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Configure multer for file uploads (supporting documents)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/leave-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'leave-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common document types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents (PDF, DOC, DOCX) and images (JPG, PNG) are allowed'));
    }
  }
});

// ============================================================================
// EMPLOYEE LEAVE REQUEST ENDPOINTS
// ============================================================================

// Get employee's own leave requests
router.get('/my-leave-requests', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, year } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT lr.*, 
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.user_id = $1
    `;
    
    const params = [req.user.id];
    let paramCounter = 2;

    if (status) {
      query += ` AND lr.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (year) {
      query += ` AND EXTRACT(YEAR FROM lr.start_date) = $${paramCounter}`;
      params.push(year);
      paramCounter++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT lr\..*?FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY lr.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const leaveRequests = result.rows.map(row => ({
      id: row.id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      halfDay: row.half_day,
      halfDayPeriod: row.half_day_period,
      totalDays: parseFloat(row.total_days),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name ? {
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name
      } : null
    }));

    res.json({
      leaveRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new leave request
router.post('/leave-request', auth, upload.single('supportingDocument'), async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      halfDay = false,
      halfDayPeriod,
      reason,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;

    // Validation
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: 'Leave type, start date, end date, and reason are required' 
      });
    }

    const validLeaveTypes = ['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement', 'other'];
    if (!validLeaveTypes.includes(leaveType)) {
      return res.status(400).json({ 
        message: `Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}` 
      });
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    // Calculate total days
    let totalDays;
    if (halfDay && start.getTime() === end.getTime()) {
      totalDays = 0.5;
      if (!halfDayPeriod || !['morning', 'afternoon'].includes(halfDayPeriod)) {
        return res.status(400).json({ 
          message: 'Half day period (morning/afternoon) is required for half-day leave' 
        });
      }
    } else if (halfDay) {
      return res.status(400).json({ 
        message: 'Half-day leave can only be for a single day' 
      });
    } else {
      // Calculate business days
      totalDays = calculateBusinessDays(start, end);
    }

    // Check for overlapping leave requests
    const overlapCheck = await pool.query(`
      SELECT id FROM leave_requests 
      WHERE user_id = $1 
      AND status IN ('pending', 'approved')
      AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
    `, [req.user.id, startDate, endDate]);

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'You already have a leave request for overlapping dates' 
      });
    }

    // Check leave balance (simplified - in real app would be more complex)
    const currentYear = new Date().getFullYear();
    const usedLeaveResult = await pool.query(`
      SELECT COALESCE(SUM(total_days), 0) as used_days
      FROM leave_requests 
      WHERE user_id = $1 
      AND leave_type = $2
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = $3
    `, [req.user.id, leaveType, currentYear]);

    const usedDays = parseFloat(usedLeaveResult.rows[0].used_days);
    const leaveBalances = {
      vacation: 21,
      sick: 10,
      personal: 3,
      emergency: 2,
      maternity: 90,
      paternity: 14,
      bereavement: 5,
      other: 5
    };

    const allowedDays = leaveBalances[leaveType] || 0;
    if (usedDays + totalDays > allowedDays) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Used: ${usedDays}, Requesting: ${totalDays}, Available: ${allowedDays - usedDays}` 
      });
    }

    // Handle file upload path
    const supportingDocumentPath = req.file ? req.file.filename : null;

    // Create leave request
    const result = await pool.query(`
      INSERT INTO leave_requests (
        user_id, leave_type, start_date, end_date, half_day, half_day_period,
        total_days, reason, supporting_document_path, emergency_contact_name, 
        emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `, [
      req.user.id, leaveType, startDate, endDate, halfDay, halfDayPeriod,
      totalDays, reason, supportingDocumentPath, emergencyContactName, 
      emergencyContactPhone
    ]);

    const leaveRequest = result.rows[0];

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: leaveRequest.id,
        leaveType: leaveRequest.leave_type,
        startDate: leaveRequest.start_date,
        endDate: leaveRequest.end_date,
        halfDay: leaveRequest.half_day,
        halfDayPeriod: leaveRequest.half_day_period,
        totalDays: parseFloat(leaveRequest.total_days),
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        supportingDocumentPath: leaveRequest.supporting_document_path,
        emergencyContactName: leaveRequest.emergency_contact_name,
        emergencyContactPhone: leaveRequest.emergency_contact_phone,
        createdAt: leaveRequest.created_at
      }
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee's leave balance
router.get('/leave-balance', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Get used leave days by type for the year
    const usedLeaveResult = await pool.query(`
      SELECT 
        leave_type,
        COALESCE(SUM(total_days), 0) as used_days
      FROM leave_requests 
      WHERE user_id = $1 
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = $2
      GROUP BY leave_type
    `, [req.user.id, year]);

    // Standard leave allocations
    const standardAllocations = {
      vacation: 21,
      sick: 10,
      personal: 3,
      emergency: 2,
      maternity: 90,
      paternity: 14,
      bereavement: 5,
      other: 5
    };

    const leaveBalance = Object.keys(standardAllocations).map(leaveType => {
      const usedRecord = usedLeaveResult.rows.find(row => row.leave_type === leaveType);
      const used = usedRecord ? parseFloat(usedRecord.used_days) : 0;
      const allocated = standardAllocations[leaveType];
      
      return {
        leaveType,
        allocated,
        used,
        remaining: allocated - used
      };
    });

    res.json({
      year: parseInt(year),
      leaveBalance
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel leave request (only if pending)
router.delete('/leave-request/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership and status
    const requestResult = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult.rows[0];

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel leave request. Current status: ${leaveRequest.status}` 
      });
    }

    // Update status to cancelled
    await pool.query(
      'UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', id]
    );

    // Delete supporting document if exists
    if (leaveRequest.supporting_document_path) {
      const filePath = path.join(__dirname, '../uploads/leave-documents', leaveRequest.supporting_document_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Leave request cancelled successfully' });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance analysis for leave justification
router.get('/attendance-analysis', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Get attendance records for the period
    const attendanceResult = await pool.query(`
      SELECT 
        date,
        MIN(time) as first_clock_in,
        MAX(time) as last_clock_out,
        COUNT(*) as total_entries
      FROM attendance_records 
      WHERE user_id = $1 
      AND date BETWEEN $2 AND $3
      GROUP BY date
      ORDER BY date
    `, [req.user.id, startDate, endDate]);

    // Analyze attendance patterns
    const violations = [];
    const patterns = {
      lateArrivals: 0,
      earlyLeaves: 0,
      irregularEntries: 0,
      absentDays: 0,
      totalWorkDays: 0
    };

    // Generate date range for analysis (business days only)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dateRange.push(new Date(d).toISOString().split('T')[0]);
        patterns.totalWorkDays++;
      }
    }

    // Check each work day
    dateRange.forEach(date => {
      const attendanceRecord = attendanceResult.rows.find(row => 
        row.date.toISOString().split('T')[0] === date
      );

      if (!attendanceRecord) {
        violations.push({
          date,
          type: 'absent',
          description: 'No attendance records for this day'
        });
        patterns.absentDays++;
      } else {
        const firstClockIn = attendanceRecord.first_clock_in;
        const lastClockOut = attendanceRecord.last_clock_out;

        // Check for late arrival (after 9:30 AM)
        if (firstClockIn && firstClockIn > '09:30:00') {
          violations.push({
            date,
            type: 'late_arrival',
            description: `Clocked in at ${firstClockIn} (after 9:30 AM)`,
            time: firstClockIn
          });
          patterns.lateArrivals++;
        }

        // Check for early leave (before 4:30 PM)
        if (lastClockOut && lastClockOut < '16:30:00') {
          violations.push({
            date,
            type: 'early_leave',
            description: `Clocked out at ${lastClockOut} (before 4:30 PM)`,
            time: lastClockOut
          });
          patterns.earlyLeaves++;
        }

        // Check for irregular entries (very late clock-out)
        if (lastClockOut && lastClockOut > '22:00:00') {
          violations.push({
            date,
            type: 'irregular_entry',
            description: `Very late clock-out at ${lastClockOut}`,
            time: lastClockOut
          });
          patterns.irregularEntries++;
        }
      }
    });

    // Calculate attendance score
    const attendanceScore = {
      totalDays: patterns.totalWorkDays,
      presentDays: patterns.totalWorkDays - patterns.absentDays,
      attendanceRate: patterns.totalWorkDays > 0 ? 
        ((patterns.totalWorkDays - patterns.absentDays) / patterns.totalWorkDays * 100).toFixed(1) : 0,
      punctualityScore: patterns.totalWorkDays > 0 ?
        ((patterns.totalWorkDays - patterns.lateArrivals - patterns.earlyLeaves) / patterns.totalWorkDays * 100).toFixed(1) : 0
    };

    res.json({
      period: { startDate, endDate },
      violations,
      patterns,
      attendanceScore
    });
  } catch (error) {
    console.error('Get attendance analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate business days
function calculateBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      businessDays++;
    }
  }

  return businessDays;
}

module.exports = router;
