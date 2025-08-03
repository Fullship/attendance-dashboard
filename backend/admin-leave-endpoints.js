// Additional endpoints for admin.js - Leave Request Management

// Get all leave requests with filtering and pagination
router.get('/leave-requests', auth, adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      leaveType, 
      userId, 
      locationId, 
      teamId,
      startDate, 
      endDate 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT lr.*, 
             u.first_name, u.last_name, u.email, u.employee_id,
             u.location_id, u.team_id,
             l.name as location_name, l.timezone as location_timezone,
             t.name as team_name,
             reviewer.first_name as reviewer_first_name, 
             reviewer.last_name as reviewer_last_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE u.is_admin = false
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

    if (userId) {
      query += ` AND lr.user_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    }

    if (locationId) {
      query += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      query += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    if (startDate) {
      query += ` AND lr.end_date >= $${paramCounter}`;
      params.push(startDate);
      paramCounter++;
    }

    if (endDate) {
      query += ` AND lr.start_date <= $${paramCounter}`;
      params.push(endDate);
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
      userId: row.user_id,
      employee: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        employeeId: row.employee_id,
        locationId: row.location_id,
        teamId: row.team_id
      },
      location: row.location_name ? {
        name: row.location_name,
        timezone: row.location_timezone
      } : null,
      team: row.team_name ? {
        name: row.team_name
      } : null,
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
    console.error('Get leave requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject leave request
router.put('/leave-requests/:id/review', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    // Get the leave request details
    const requestResult = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = requestResult.rows[0];

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot ${action} leave request. Current status: ${leaveRequest.status}` 
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the leave request
    const updateResult = await pool.query(
      `UPDATE leave_requests 
       SET status = $1, reviewed_by = $2, admin_notes = $3, 
           reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 
       RETURNING *`,
      [newStatus, req.user.id, adminNotes || '', id]
    );

    const updatedRequest = updateResult.rows[0];

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        reviewedAt: updatedRequest.reviewed_at
      }
    });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave request statistics
router.get('/leave-requests/stats', auth, adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), locationId, teamId } = req.query;

    let baseQuery = `
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      AND u.is_admin = false
    `;
    
    const params = [year];
    let paramCounter = 2;

    if (locationId) {
      baseQuery += ` AND u.location_id = $${paramCounter}`;
      params.push(locationId);
      paramCounter++;
    }

    if (teamId) {
      baseQuery += ` AND u.team_id = $${paramCounter}`;
      params.push(teamId);
      paramCounter++;
    }

    // Get overall statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN lr.status = 'approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN lr.status = 'rejected' THEN 1 END) as rejected_requests,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as total_approved_days
      ${baseQuery}
    `, params);

    // Get statistics by leave type
    const typeStats = await pool.query(`
      SELECT 
        lr.leave_type,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END), 0) as approved_days
      ${baseQuery}
      GROUP BY lr.leave_type
      ORDER BY count DESC
    `, params);

    res.json({
      year: parseInt(year),
      overall: overallStats.rows[0],
      byType: typeStats.rows
    });
  } catch (error) {
    console.error('Get leave request stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leave balance for any employee (admin view)
router.get('/leave-balance/:userId', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const user = userResult.rows[0];

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
    `, [userId, year]);

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
      employee: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      },
      year: parseInt(year),
      leaveBalance
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
