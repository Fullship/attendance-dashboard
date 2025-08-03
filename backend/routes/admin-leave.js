const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// ============================================================================
// ADMIN LEAVE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all leave requests for admin review
router.get('/admin/leave-requests', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 20,
      status,
      leaveType,
      teamId,
      year = new Date().getFullYear(),
      startDate,
      endDate,
    } = req.query;

    // Ensure page and limit are positive integers
    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const offset = (pageInt - 1) * limitInt;

    let query = `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.id as employee_id, u.team_id,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name,
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE 1=1
    `;

    const params = [];
    let paramCounter = 1;

    if (status) {
      query += ` AND lr.status = $${paramCounter}`;
      params.push(status);
      paramCounter++;
    }

    if (leaveType) {
      query += ` AND lr.leave_type = $${paramCounter}`;
      params.push(leaveType);
      paramCounter++;
    }

    if (teamId) {
      query += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    if (year) {
      query += ` AND EXTRACT(YEAR FROM lr.start_date) = $${paramCounter}`;
      params.push(year);
      paramCounter++;
    }

    if (startDate && endDate) {
      query += ` AND lr.start_date >= $${paramCounter} AND lr.end_date <= $${paramCounter + 1}`;
      params.push(startDate, endDate);
      paramCounter += 2;
    }

    // Get total count with a separate query
    let countQuery = `
      SELECT COUNT(*) 
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE 1=1
    `;

    // Add the same filters as the main query
    let countParams = [];
    let countParamCounter = 1;

    if (status) {
      countQuery += ` AND lr.status = $${countParamCounter}`;
      countParams.push(status);
      countParamCounter++;
    }

    if (leaveType) {
      countQuery += ` AND lr.leave_type = $${countParamCounter}`;
      countParams.push(leaveType);
      countParamCounter++;
    }

    if (teamId) {
      countQuery += ` AND u.team_id = $${countParamCounter}`;
      countParams.push(teamId);
      countParamCounter++;
    }

    if (startDate && endDate) {
      countQuery += ` AND lr.start_date >= $${countParamCounter} AND lr.end_date <= $${
        countParamCounter + 1
      }`;
      countParams.push(startDate, endDate);
      countParamCounter += 2;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    console.log('DEBUG: Count query result:', countResult.rows[0]);
    console.log('DEBUG: Total count:', total);

    // Validate page number - if page is beyond available pages, return empty result
    const totalPages = Math.ceil(total / limitInt);
    if (pageInt > totalPages && total > 0) {
      return res.json({
        leaveRequests: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          pages: totalPages,
        },
      });
    }

    // Add ordering and pagination
    query += ` ORDER BY 
      CASE lr.status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'rejected' THEN 3 
        WHEN 'cancelled' THEN 4 
      END,
      lr.created_at DESC 
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    params.push(limitInt, offset);

    const result = await pool.query(query, params);

    const leaveRequests = result.rows.map(row => ({
      id: row.id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        employeeId: row.employee_id,
        teamId: row.team_id,
        teamName: row.team_name,
      },
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
      teamConflictCheck: row.team_conflict_check,
      adminNotes: row.admin_notes,
      supportingDocumentPath: row.supporting_document_path,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at,
      reviewer: row.reviewer_first_name
        ? {
            firstName: row.reviewer_first_name,
            lastName: row.reviewer_last_name,
          }
        : null,
    }));

    // Get statistics
    const statsResult = await pool.query(
      `
      SELECT 
        status,
        COUNT(*) as count
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY status
    `,
      [year]
    );

    const statistics = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    statsResult.rows.forEach(row => {
      statistics[row.status] = parseInt(row.count);
    });

    res.json({
      leaveRequests,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt),
      },
      statistics,
      year: parseInt(year),
    });

    console.log('DEBUG: Final response pagination:', {
      page: pageInt,
      limit: limitInt,
      total,
      pages: Math.ceil(total / limitInt),
    });
  } catch (error) {
    console.error('Get admin leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review leave request (approve/reject)
router.put('/admin/leave-request/:id/review', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    const { action, adminNotes = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "approve" or "reject"' });
    }

    // Get leave request details
    const requestResult = await pool.query(
      `
      SELECT lr.*, u.first_name, u.last_name, u.email, u.team_id
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.id = $1
    `,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult.rows[0];

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot review leave request. Current status: ${leaveRequest.status}`,
      });
    }

    // If approving, perform additional validations
    if (action === 'approve') {
      // Check if leave dates have passed
      const startDate = new Date(leaveRequest.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return res.status(400).json({
          message: 'Cannot approve leave request for past dates',
        });
      }

      // Re-check team capacity
      const teamCapacity = await checkTeamLeaveCapacity(
        leaveRequest.user_id,
        leaveRequest.start_date,
        leaveRequest.end_date
      );

      if (!teamCapacity.canApprove) {
        return res.status(400).json({
          message: 'Team leave capacity would be exceeded. Cannot approve.',
          conflicts: teamCapacity.conflicts,
        });
      }

      // Update semi-annual tracking for vacation leave
      if (leaveRequest.leave_type === 'vacation') {
        await pool.query(
          `
          UPDATE semi_annual_leave_tracking 
          SET vacation_days_used = vacation_days_used + $1
          WHERE user_id = $2 AND semi_annual_period = $3 AND year = $4
        `,
          [
            parseFloat(leaveRequest.total_days),
            leaveRequest.user_id,
            leaveRequest.semi_annual_period,
            new Date().getFullYear(),
          ]
        );
      }

      // Update weekend leave tracking if applicable
      if (leaveRequest.is_weekend_leave) {
        const weekendDays = calculateWeekendDaysInRange(
          leaveRequest.start_date,
          leaveRequest.end_date
        );

        await pool.query(
          `
          UPDATE semi_annual_leave_tracking 
          SET weekend_leaves_used = weekend_leaves_used + $1
          WHERE user_id = $2 AND semi_annual_period = $3 AND year = $4
        `,
          [
            weekendDays,
            leaveRequest.user_id,
            leaveRequest.semi_annual_period,
            new Date().getFullYear(),
          ]
        );
      }
    }

    // Update leave request status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      `
      UPDATE leave_requests 
      SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
      [newStatus, adminNotes, req.user.id, id]
    );

    // Get updated leave request
    const updatedResult = await pool.query(
      `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email,
             reviewer.first_name as reviewer_first_name,
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE lr.id = $1
    `,
      [id]
    );

    const updatedRequest = updatedResult.rows[0];

    // Invalidate cache after admin review
    try {
      const cacheService = require('../config/redis').cacheService;
      const CacheKeys = require('../config/redis').CacheKeys;

      // Invalidate the specific user's leave requests cache
      await cacheService.delete(CacheKeys.leaveRequests(leaveRequest.user_id));
      // Invalidate user's attendance calendar cache to refresh leave indicators
      await cacheService.delPattern(
        `${CacheKeys.attendanceCalendar(leaveRequest.user_id, '*', '*')}`
      );
      // Invalidate admin leave requests cache
      await cacheService.deletePattern('leave:*');
      await cacheService.deletePattern('analytics:*');

      console.log(
        `Cache invalidated for user ${leaveRequest.user_id} after admin review (${action})`
      );
    } catch (cacheError) {
      console.error('Cache invalidation error:', cacheError);
      // Don't fail the request if cache invalidation fails
    }

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        id: updatedRequest.id,
        employee: {
          firstName: updatedRequest.first_name,
          lastName: updatedRequest.last_name,
          email: updatedRequest.email,
        },
        leaveType: updatedRequest.leave_type,
        startDate: updatedRequest.start_date,
        endDate: updatedRequest.end_date,
        totalDays: parseFloat(updatedRequest.total_days),
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        reviewedAt: updatedRequest.reviewed_at,
        reviewer: {
          firstName: updatedRequest.reviewer_first_name,
          lastName: updatedRequest.reviewer_last_name,
        },
      },
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave analytics for admin dashboard
router.get('/admin/leave-analytics', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { year = new Date().getFullYear() } = req.query;

    // Leave requests by month
    const monthlyResult = await pool.query(
      `
      SELECT 
        EXTRACT(MONTH FROM start_date) as month,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        SUM(CASE WHEN status = 'approved' THEN total_days ELSE 0 END) as total_days_taken
      FROM leave_requests 
      WHERE EXTRACT(YEAR FROM start_date) = $1
      GROUP BY EXTRACT(MONTH FROM start_date)
      ORDER BY month
    `,
      [year]
    );

    // Leave requests by type
    const typeResult = await pool.query(
      `
      SELECT 
        leave_type,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
        SUM(CASE WHEN status = 'approved' THEN total_days ELSE 0 END) as total_days_taken
      FROM leave_requests 
      WHERE EXTRACT(YEAR FROM start_date) = $1
      GROUP BY leave_type
      ORDER BY total_requests DESC
    `,
      [year]
    );

    // Leave requests by team
    const teamResult = await pool.query(
      `
      SELECT 
        t.name as team_name,
        COUNT(lr.id) as total_requests,
        COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
        SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END) as total_days_taken,
        COUNT(DISTINCT u.id) as team_members
      FROM teams t
      LEFT JOIN users u ON t.id = u.team_id AND u.is_admin = false
      LEFT JOIN leave_requests lr ON u.id = lr.user_id AND EXTRACT(YEAR FROM lr.start_date) = $1
      WHERE t.is_active = true
      GROUP BY t.id, t.name
      ORDER BY total_requests DESC NULLS LAST
    `,
      [year]
    );

    // Top leave takers
    const topTakersResult = await pool.query(
      `
      SELECT 
        u.first_name,
        u.last_name,
        u.employee_id,
        t.name as team_name,
        COUNT(lr.id) as total_requests,
        SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END) as total_days_taken
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN leave_requests lr ON u.id = lr.user_id AND EXTRACT(YEAR FROM lr.start_date) = $1
      WHERE u.is_admin = false
      GROUP BY u.id, u.first_name, u.last_name, u.employee_id, t.name
      HAVING COUNT(lr.id) > 0
      ORDER BY total_days_taken DESC
      LIMIT 10
    `,
      [year]
    );

    // Semi-annual vacation usage
    const semiAnnualResult = await pool.query(
      `
      SELECT 
        u.first_name,
        u.last_name,
        t.name as team_name,
        salt.semi_annual_period,
        salt.vacation_days_used,
        salt.weekend_leaves_used
      FROM semi_annual_leave_tracking salt
      JOIN users u ON salt.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE salt.year = $1
      ORDER BY u.first_name, u.last_name, salt.semi_annual_period
    `,
      [year]
    );

    // Business rule violations
    const violationsResult = await pool.query(
      `
      SELECT 
        'Weekend Leave Limit' as rule_type,
        COUNT(*) as violations
      FROM semi_annual_leave_tracking 
      WHERE year = $1 AND weekend_leaves_used > 2
      
      UNION ALL
      
      SELECT 
        'Long Leave Period' as rule_type,
        COUNT(*) as violations
      FROM leave_requests 
      WHERE EXTRACT(YEAR FROM start_date) = $1 AND total_days > 5
      
      UNION ALL
      
      SELECT 
        'Team Capacity Issues' as rule_type,
        COUNT(*) as violations
      FROM leave_requests 
      WHERE EXTRACT(YEAR FROM start_date) = $1 AND team_conflict_check = false
    `,
      [year]
    );

    res.json({
      year: parseInt(year),
      monthlyTrends: monthlyResult.rows.map(row => ({
        month: parseInt(row.month),
        totalRequests: parseInt(row.total_requests),
        approvedRequests: parseInt(row.approved_requests),
        totalDaysTaken: parseFloat(row.total_days_taken) || 0,
      })),
      leaveTypeBreakdown: typeResult.rows.map(row => ({
        leaveType: row.leave_type,
        totalRequests: parseInt(row.total_requests),
        approvedRequests: parseInt(row.approved_requests),
        totalDaysTaken: parseFloat(row.total_days_taken) || 0,
      })),
      teamAnalytics: teamResult.rows.map(row => ({
        teamName: row.team_name,
        totalRequests: parseInt(row.total_requests) || 0,
        approvedRequests: parseInt(row.approved_requests) || 0,
        totalDaysTaken: parseFloat(row.total_days_taken) || 0,
        teamMembers: parseInt(row.team_members) || 0,
        averageDaysPerMember:
          row.team_members > 0
            ? ((parseFloat(row.total_days_taken) || 0) / parseInt(row.team_members)).toFixed(2)
            : 0,
      })),
      topLeaveTakers: topTakersResult.rows.map(row => ({
        employeeName: `${row.first_name} ${row.last_name}`,
        employeeId: row.employee_id,
        teamName: row.team_name,
        totalRequests: parseInt(row.total_requests),
        totalDaysTaken: parseFloat(row.total_days_taken),
      })),
      semiAnnualUsage: semiAnnualResult.rows.map(row => ({
        employeeName: `${row.first_name} ${row.last_name}`,
        teamName: row.team_name,
        semiAnnualPeriod: row.semi_annual_period,
        vacationDaysUsed: parseFloat(row.vacation_days_used),
        weekendLeavesUsed: parseInt(row.weekend_leaves_used),
        vacationRemaining: 12 - parseFloat(row.vacation_days_used),
        weekendRemaining: 2 - parseInt(row.weekend_leaves_used),
      })),
      ruleViolations: violationsResult.rows.map(row => ({
        ruleType: row.rule_type,
        violations: parseInt(row.violations),
      })),
    });
  } catch (error) {
    console.error('Get leave analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Manage company holidays
router.post('/admin/company-holidays', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, date, isRecurring = false, holidayType = 'national' } = req.body;

    if (!name || !date) {
      return res.status(400).json({ message: 'Holiday name and date are required' });
    }

    // Check if holiday already exists for the date
    const existing = await pool.query('SELECT id FROM company_holidays WHERE date = $1', [date]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Holiday already exists for this date' });
    }

    const result = await pool.query(
      `
      INSERT INTO company_holidays (name, date, is_recurring, holiday_type, approved_by, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `,
      [name, date, isRecurring, holidayType, req.user.id]
    );

    res.status(201).json({
      message: 'Company holiday added successfully',
      holiday: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        date: result.rows[0].date,
        isRecurring: result.rows[0].is_recurring,
        holidayType: result.rows[0].holiday_type,
        approvedBy: result.rows[0].approved_by,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Add company holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete company holiday
router.delete('/admin/company-holidays/:id', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM company_holidays WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company holiday not found' });
    }

    res.json({ message: 'Company holiday deleted successfully' });
  } catch (error) {
    console.error('Delete company holiday error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset semi-annual leave balances (for new period)
router.post('/admin/reset-semi-annual', auth, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const currentYear = new Date().getFullYear();
    const currentSemiAnnual = getCurrentSemiAnnual();

    // Get all active employees
    const employees = await pool.query(
      'SELECT id FROM users WHERE is_admin = false AND is_active = true'
    );

    // Create new semi-annual tracking records for all employees
    for (const employee of employees.rows) {
      await pool.query(
        `
        INSERT INTO semi_annual_leave_tracking (user_id, semi_annual_period, year, vacation_days_used, weekend_leaves_used)
        VALUES ($1, $2, $3, 0, 0)
        ON CONFLICT (user_id, semi_annual_period, year) DO NOTHING
      `,
        [employee.id, currentSemiAnnual, currentYear]
      );
    }

    res.json({
      message: `Semi-annual leave balances reset for period ${currentSemiAnnual} of ${currentYear}`,
      affectedEmployees: employees.rows.length,
      period: currentSemiAnnual,
      year: currentYear,
    });
  } catch (error) {
    console.error('Reset semi-annual balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
function getCurrentSemiAnnual() {
  const month = new Date().getMonth() + 1;
  return month <= 6 ? 1 : 2;
}

function calculateWeekendDaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let weekendDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 4) {
      // Sunday or Thursday
      weekendDays++;
    }
  }
  return weekendDays;
}

async function checkTeamLeaveCapacity(userId, startDate, endDate) {
  try {
    const userTeam = await pool.query('SELECT team_id FROM users WHERE id = $1', [userId]);

    if (!userTeam.rows.length || !userTeam.rows[0].team_id) {
      return { canApprove: true, message: 'User not assigned to team' };
    }

    const teamId = userTeam.rows[0].team_id;

    const teamCount = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE team_id = $1 AND is_admin = false',
      [teamId]
    );

    const totalMembers = parseInt(teamCount.rows[0].total);
    const maxAllowed = Math.floor(totalMembers * 0.49);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const conflicts = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        // Sunday to Thursday
        const dateStr = d.toISOString().split('T')[0];

        const existingLeaves = await pool.query(
          `
          SELECT COUNT(*) as count 
          FROM leave_requests lr
          JOIN users u ON lr.user_id = u.id
          WHERE u.team_id = $1 
          AND lr.status = 'approved'
          AND $2 BETWEEN lr.start_date AND lr.end_date
          AND lr.user_id != $3
        `,
          [teamId, dateStr, userId]
        );

        const currentLeaves = parseInt(existingLeaves.rows[0].count);

        if (currentLeaves >= maxAllowed) {
          conflicts.push({
            date: dateStr,
            currentLeaves,
            maxAllowed,
            totalMembers,
          });
        }
      }
    }

    return {
      canApprove: conflicts.length === 0,
      conflicts,
      teamInfo: { teamId, totalMembers, maxAllowed },
    };
  } catch (error) {
    console.error('Team capacity check error:', error);
    return { canApprove: false, message: 'Error checking team capacity' };
  }
}

module.exports = router;
