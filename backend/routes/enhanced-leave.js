const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Import cache middleware
const {
  leaveRequestsCache,
  invalidateCacheMiddleware,
  invalidateLeaveCache,
  invalidateUserCache,
  rateLimitMiddleware
} = require('../middleware/cache');
const { CacheKeys } = require('../config/redis');

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
// ENHANCED BUSINESS RULES HELPER FUNCTIONS
// ============================================================================

// Get current semi-annual period (1: Jan-Jun, 2: Jul-Dec)
function getCurrentSemiAnnual() {
  const month = new Date().getMonth() + 1; // 1-12
  return month <= 6 ? 1 : 2;
}

// Check if date is a working day (Sunday-Thursday)
function isWorkingDay(date) {
  const day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return day >= 0 && day <= 4; // Sunday(0) to Thursday(4)
}

// Check if date is weekend working day (Sunday or Thursday)
function isWeekendWorkingDay(date) {
  const day = date.getDay();
  return day === 0 || day === 4; // Sunday or Thursday
}

// Calculate business days (Sunday-Thursday only)
function calculateBusinessDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isWorkingDay(d)) {
      businessDays++;
    }
  }
  return businessDays;
}

// Check team leave capacity
async function checkTeamLeaveCapacity(userId, startDate, endDate) {
  try {
    // Get user's team
    const userTeam = await pool.query(
      'SELECT team_id FROM users WHERE id = $1',
      [userId]
    );

    if (!userTeam.rows.length || !userTeam.rows[0].team_id) {
      return { canApprove: true, message: 'User not assigned to team' };
    }

    const teamId = userTeam.rows[0].team_id;

    // Get total team members
    const teamCount = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE team_id = $1 AND is_admin = false',
      [teamId]
    );

    const totalMembers = parseInt(teamCount.rows[0].total);
    const maxAllowed = Math.floor(totalMembers * 0.49); // Maximum 49%

    // Check each date in the range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const conflicts = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (isWorkingDay(d)) {
        const dateStr = d.toISOString().split('T')[0];
        
        // Count existing approved leaves for this date
        const existingLeaves = await pool.query(`
          SELECT COUNT(*) as count 
          FROM leave_requests lr
          JOIN users u ON lr.user_id = u.id
          WHERE u.team_id = $1 
          AND lr.status = 'approved'
          AND $2 BETWEEN lr.start_date AND lr.end_date
        `, [teamId, dateStr]);

        const currentLeaves = parseInt(existingLeaves.rows[0].count);
        
        if (currentLeaves >= maxAllowed) {
          conflicts.push({
            date: dateStr,
            currentLeaves,
            maxAllowed,
            totalMembers
          });
        }
      }
    }

    return {
      canApprove: conflicts.length === 0,
      conflicts,
      teamInfo: {
        teamId,
        totalMembers,
        maxAllowed
      }
    };
  } catch (error) {
    console.error('Team capacity check error:', error);
    return { canApprove: false, message: 'Error checking team capacity' };
  }
}

// ============================================================================
// EMPLOYEE LEAVE REQUEST ENDPOINTS
// ============================================================================

// Get employee's enhanced leave balance
router.get('/leave-balance', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const currentSemiAnnual = getCurrentSemiAnnual();

    // Get or create semi-annual tracking record
    await pool.query(`
      INSERT INTO semi_annual_leave_tracking (user_id, semi_annual_period, year, vacation_days_used, weekend_leaves_used)
      VALUES ($1, $2, $3, 0, 0)
      ON CONFLICT (user_id, semi_annual_period, year) DO NOTHING
    `, [req.user.id, currentSemiAnnual, year]);

    // Get current semi-annual usage
    const semiAnnualUsage = await pool.query(`
      SELECT vacation_days_used, weekend_leaves_used
      FROM semi_annual_leave_tracking
      WHERE user_id = $1 AND semi_annual_period = $2 AND year = $3
    `, [req.user.id, currentSemiAnnual, year]);

    // Get total used leave days by type for the year
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

    // Enhanced leave allocations based on new rules
    const leaveAllocations = {
      vacation: {
        annual: 24,
        semiAnnual: 12, // 24 days divided into two semi-annuals
        resetPeriod: 'semi-annual'
      },
      sick: {
        annual: 10,
        requiresApproval: true,
        approver: 'admin'
      },
      personal: {
        annual: 3,
        maxConsecutive: 5
      },
      emergency: {
        annual: 2,
        maxConsecutive: 5
      },
      maternity: {
        total: 90,
        basicPay: 60, // 2 months
        workFromHome: 30, // 1 month
        description: '2 months basic pay + 1 month work from home'
      },
      paternity: {
        annual: 14,
        maxConsecutive: 14
      },
      bereavement: {
        annual: 5,
        maxConsecutive: 5
      }
    };

    const leaveBalance = Object.keys(leaveAllocations).map(leaveType => {
      const allocation = leaveAllocations[leaveType];
      const usedRecord = usedLeaveResult.rows.find(row => row.leave_type === leaveType);
      const used = usedRecord ? parseFloat(usedRecord.used_days) : 0;
      
      let allocated, remaining;
      
      if (leaveType === 'vacation') {
        // For vacation, use semi-annual allocation
        const semiUsed = semiAnnualUsage.rows.length > 0 ? 
          parseFloat(semiAnnualUsage.rows[0].vacation_days_used) : 0;
        allocated = allocation.semiAnnual;
        remaining = allocated - semiUsed;
      } else {
        allocated = allocation.annual || allocation.total;
        remaining = allocated - used;
      }
      
      return {
        leaveType,
        allocated,
        used: leaveType === 'vacation' ? 
          (semiAnnualUsage.rows.length > 0 ? parseFloat(semiAnnualUsage.rows[0].vacation_days_used) : 0) : 
          used,
        remaining: Math.max(0, remaining),
        ...allocation
      };
    });

    // Get weekend leave usage for current semi-annual
    const weekendUsage = semiAnnualUsage.rows.length > 0 ? 
      parseInt(semiAnnualUsage.rows[0].weekend_leaves_used) : 0;

    res.json({
      year: parseInt(year),
      currentSemiAnnual,
      leaveBalance,
      weekendLeaveUsage: {
        used: weekendUsage,
        remaining: Math.max(0, 2 - weekendUsage), // Max 2 per semi-annual
        maxAllowed: 2
      },
      businessRules: {
        workingDays: 'Sunday to Thursday',
        weekends: 'Friday and Saturday',
        workingHours: '9:00 AM - 5:00 PM',
        lunchBreak: '1:00 PM - 2:00 PM (max 45 minutes)',
        maxConsecutiveLeave: 5,
        teamLeaveLimit: '49% of team members',
        weekendLeaveLimit: '2 per semi-annual (Thursday/Sunday)'
      }
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new leave request with enhanced validation
router.post('/leave-request', 
  auth, 
  rateLimitMiddleware(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  upload.single('supportingDocument'), 
  async (req, res) => {
  try {
    console.log('Leave request received:', JSON.stringify(req.body, null, 2));
    
    const {
      leaveType,
      startDate,
      endDate,
      halfDay: halfDayRaw = false,
      halfDayPeriod,
      reason,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;

    // Ensure halfDay is properly parsed as boolean
    const halfDay = halfDayRaw === true || halfDayRaw === 'true' || halfDayRaw === '1';

    console.log('Parsed values:', {
      leaveType,
      startDate,
      endDate,
      halfDayRaw,
      halfDay,
      halfDayPeriod,
      reason,
      halfDayType: typeof halfDayRaw,
      halfDayValue: halfDayRaw,
      halfDayPeriodType: typeof halfDayPeriod,
      halfDayPeriodValue: halfDayPeriod
    });

    // Basic validation
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: 'Leave type, start date, end date, and reason are required' 
      });
    }

    const validLeaveTypes = ['vacation', 'sick', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement', 'other'];
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

    // Same-day validation: Only half-day requests allowed for current date
    const startDateOnly = new Date(start);
    startDateOnly.setHours(0, 0, 0, 0);
    
    if (startDateOnly.getTime() === today.getTime()) {
      // If requesting leave for today, only half-day is allowed
      if (!halfDay) {
        return res.status(400).json({ 
          message: 'Full-day leave cannot be requested for the same day. Only half-day leave is allowed for today.' 
        });
      }
      
      // For same-day requests, ensure it's only for today (not spanning multiple days)
      const endDateOnly = new Date(end);
      endDateOnly.setHours(0, 0, 0, 0);
      
      if (endDateOnly.getTime() !== today.getTime()) {
        return res.status(400).json({ 
          message: 'Same-day leave requests can only be for today, not spanning multiple days.' 
        });
      }
    }

    // Check if dates are working days
    const nonWorkingDays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!isWorkingDay(d)) {
        nonWorkingDays.push(d.toISOString().split('T')[0]);
      }
    }

    if (nonWorkingDays.length > 0) {
      return res.status(400).json({ 
        message: `Leave request includes non-working days (Fridays/Saturdays): ${nonWorkingDays.join(', ')}. Working days are Sunday to Thursday.` 
      });
    }

    // Calculate total days (business days only)
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
      totalDays = calculateBusinessDays(start, end);
    }

    // Rule: Maximum 5 consecutive working days
    if (totalDays > 5) {
      return res.status(400).json({ 
        message: 'Maximum consecutive leave period is 5 working days' 
      });
    }

    // Check for weekend leave limits (Thursday/Sunday)
    const weekendDays = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (isWeekendWorkingDay(d)) {
        weekendDays.push(d.toISOString().split('T')[0]);
      }
    }

    if (weekendDays.length > 0) {
      const currentSemiAnnual = getCurrentSemiAnnual();
      const currentYear = new Date().getFullYear();
      
      const weekendUsage = await pool.query(`
        SELECT weekend_leaves_used 
        FROM semi_annual_leave_tracking
        WHERE user_id = $1 AND semi_annual_period = $2 AND year = $3
      `, [req.user.id, currentSemiAnnual, currentYear]);

      const currentWeekendUsage = weekendUsage.rows.length > 0 ? 
        parseInt(weekendUsage.rows[0].weekend_leaves_used) : 0;

      if (currentWeekendUsage + weekendDays.length > 2) {
        return res.status(400).json({ 
          message: `Exceeded weekend leave limit. You can only take 2 leaves on Thursday/Sunday per semi-annual. Current usage: ${currentWeekendUsage}, Requesting: ${weekendDays.length}` 
        });
      }
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

    // Check leave balance
    const currentSemiAnnual = getCurrentSemiAnnual();
    const currentYear = new Date().getFullYear();

    if (leaveType === 'vacation') {
      // Check semi-annual vacation balance
      const semiUsage = await pool.query(`
        SELECT vacation_days_used 
        FROM semi_annual_leave_tracking
        WHERE user_id = $1 AND semi_annual_period = $2 AND year = $3
      `, [req.user.id, currentSemiAnnual, currentYear]);

      const usedDays = semiUsage.rows.length > 0 ? 
        parseFloat(semiUsage.rows[0].vacation_days_used) : 0;
      
      if (usedDays + totalDays > 12) { // 12 days per semi-annual
        return res.status(400).json({ 
          message: `Insufficient vacation balance for this semi-annual. Used: ${usedDays}, Requesting: ${totalDays}, Available: ${12 - usedDays}` 
        });
      }
    } else {
      // Check annual balance for other leave types
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
    }

    // Check team leave capacity (49% rule)
    const teamCapacity = await checkTeamLeaveCapacity(req.user.id, startDate, endDate);
    if (!teamCapacity.canApprove) {
      return res.status(400).json({ 
        message: `Team leave capacity exceeded. Maximum 49% of team members can be on leave on the same dates.`,
        conflicts: teamCapacity.conflicts,
        teamInfo: teamCapacity.teamInfo
      });
    }

    // Handle file upload path
    const supportingDocumentPath = req.file ? req.file.filename : null;

    // Determine leave category and approval requirements
    let leaveCategory = 'regular';
    let requiresManagementApproval = false;

    if (leaveType === 'sick') {
      leaveCategory = 'medical';
    } else if (['maternity', 'paternity'].includes(leaveType)) {
      leaveCategory = 'family';
    } else if (totalDays > 3) {
      requiresManagementApproval = true;
      leaveCategory = 'extended';
    }

    // Create leave request
    const result = await pool.query(`
      INSERT INTO leave_requests (
        user_id, leave_type, start_date, end_date, half_day, half_day_period,
        total_days, reason, supporting_document_path, emergency_contact_name, 
        emergency_contact_phone, semi_annual_period, leave_category, 
        is_weekend_leave, team_conflict_check
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *
    `, [
      req.user.id, leaveType, startDate, endDate, halfDay, halfDayPeriod,
      totalDays, reason, supportingDocumentPath, emergencyContactName, 
      emergencyContactPhone, currentSemiAnnual, leaveCategory,
      weekendDays.length > 0, teamCapacity.canApprove
    ]);

    const leaveRequest = result.rows[0];

    // Invalidate cache after successful creation
    try {
      const cacheService = require('../config/redis').cacheService;
      const CacheKeys = require('../config/redis').CacheKeys;
      
      // Invalidate user's leave requests cache (all variations)
      await cacheService.delPattern(`${CacheKeys.leaveRequests(req.user.id)}*`);
      // Invalidate attendance calendar cache to refresh leave indicators
      await cacheService.delPattern(`${CacheKeys.attendanceCalendar(req.user.id, '*', '*')}`);
      // Invalidate leave analytics cache
      await cacheService.delPattern('leave:*');
      await cacheService.delPattern('analytics:*');
      
      console.log(`Cache invalidated for user ${req.user.id} after leave request creation`);
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
      // Don't fail the request if cache invalidation fails
    }

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
        leaveCategory: leaveRequest.leave_category,
        isWeekendLeave: leaveRequest.is_weekend_leave,
        semiAnnualPeriod: leaveRequest.semi_annual_period,
        supportingDocumentPath: leaveRequest.supporting_document_path,
        emergencyContactName: leaveRequest.emergency_contact_name,
        emergencyContactPhone: leaveRequest.emergency_contact_phone,
        createdAt: leaveRequest.created_at
      },
      businessRules: {
        requiresManagementApproval,
        leaveCategory,
        teamCapacityCheck: teamCapacity.canApprove
      }
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee's own leave requests
router.get('/my-leave-requests', auth, leaveRequestsCache(1800), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, year } = req.query;
    
    // Ensure page and limit are positive integers
    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 10);
    const offset = (pageInt - 1) * limitInt;
    
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
    let countQuery = `
      SELECT COUNT(*) 
      FROM leave_requests lr
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.user_id = $1
    `;
    
    const countParams = [req.user.id];
    let countParamCounter = 2;
    
    if (status) {
      countQuery += ` AND lr.status = $${countParamCounter}`;
      countParams.push(status);
      countParamCounter++;
    }

    if (year) {
      countQuery += ` AND EXTRACT(YEAR FROM lr.start_date) = $${countParamCounter}`;
      countParams.push(year);
      countParamCounter++;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Validate page number - if page is beyond available pages, return empty result
    const totalPages = Math.ceil(total / limitInt);
    if (pageInt > totalPages && total > 0) {
      return res.json({
        leaveRequests: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          pages: totalPages
        }
      });
    }

    // Add ordering and pagination
    query += ` ORDER BY lr.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limitInt, offset);

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
      leaveCategory: row.leave_category,
      isWeekendLeave: row.is_weekend_leave,
      semiAnnualPeriod: row.semi_annual_period,
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
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
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

    // Invalidate cache after successful cancellation
    try {
      const cacheService = require('../config/redis').cacheService;
      const CacheKeys = require('../config/redis').CacheKeys;
      
      // Invalidate user's leave requests cache (all variations)
      await cacheService.delPattern(`${CacheKeys.leaveRequests(req.user.id)}*`);
      // Invalidate attendance calendar cache to refresh leave indicators
      await cacheService.delPattern(`${CacheKeys.attendanceCalendar(req.user.id, '*', '*')}`);
      // Invalidate leave analytics cache
      await cacheService.delPattern('leave:*');
      await cacheService.delPattern('analytics:*');
      
      console.log(`Cache invalidated for user ${req.user.id} after leave request cancellation`);
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
      // Don't fail the request if cache invalidation fails
    }

    res.json({ message: 'Leave request cancelled successfully' });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get company holidays
router.get('/company-holidays', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const result = await pool.query(`
      SELECT * FROM company_holidays 
      WHERE EXTRACT(YEAR FROM date) = $1
      ORDER BY date
    `, [year]);

    res.json({
      holidays: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        date: row.date,
        isRecurring: row.is_recurring,
        holidayType: row.holiday_type,
        approvedBy: row.approved_by
      })),
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get company holidays error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get on/off tracker dashboard data
router.get('/dashboard-tracker', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's leave status
    const todayLeave = await pool.query(`
      SELECT lr.*, u.first_name, u.last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.status = 'approved'
      AND $1 BETWEEN lr.start_date AND lr.end_date
      ORDER BY u.first_name, u.last_name
    `, [today]);

    // Get this week's leave overview
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

    const weekLeaves = await pool.query(`
      SELECT lr.*, u.first_name, u.last_name, u.team_id,
             t.name as team_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE lr.status = 'approved'
      AND (lr.start_date <= $2 AND lr.end_date >= $1)
      ORDER BY lr.start_date, u.first_name
    `, [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]);

    // Get team capacity overview
    const teamCapacity = await pool.query(`
      SELECT 
        t.id as team_id,
        t.name as team_name,
        COUNT(u.id) as total_members,
        COUNT(CASE WHEN $1 BETWEEN lr.start_date AND lr.end_date 
                   AND lr.status = 'approved' THEN 1 END) as on_leave_today
      FROM teams t
      LEFT JOIN users u ON t.id = u.team_id AND u.is_admin = false
      LEFT JOIN leave_requests lr ON u.id = lr.user_id
      WHERE t.is_active = true
      GROUP BY t.id, t.name
      ORDER BY t.name
    `, [today]);

    res.json({
      date: today,
      todaysLeaves: todayLeave.rows.map(row => ({
        employeeName: `${row.first_name} ${row.last_name}`,
        leaveType: row.leave_type,
        isHalfDay: row.half_day,
        halfDayPeriod: row.half_day_period
      })),
      weekOverview: weekLeaves.rows.map(row => ({
        employeeName: `${row.first_name} ${row.last_name}`,
        teamName: row.team_name,
        leaveType: row.leave_type,
        startDate: row.start_date,
        endDate: row.end_date,
        totalDays: parseFloat(row.total_days)
      })),
      teamCapacity: teamCapacity.rows.map(row => ({
        teamName: row.team_name,
        totalMembers: parseInt(row.total_members),
        onLeaveToday: parseInt(row.on_leave_today),
        availableMembers: parseInt(row.total_members) - parseInt(row.on_leave_today),
        capacityUsed: row.total_members > 0 ? 
          ((parseInt(row.on_leave_today) / parseInt(row.total_members)) * 100).toFixed(1) : 0
      })),
      businessRules: {
        workingDays: 'Sunday to Thursday',
        workingHours: '9:00 AM - 5:00 PM',
        lunchBreak: '1:00 PM - 2:00 PM (max 45 minutes)',
        maxTeamCapacity: '49%'
      }
    });
  } catch (error) {
    console.error('Get dashboard tracker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
