const express = require('express');
const { auth } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const result = await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, first_name, last_name, is_admin',
      [firstName, lastName, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: user.is_admin
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit clock request
router.post('/clock-request', auth, async (req, res) => {
  try {
    const { requestType, requestedTime, reason } = req.body;
    
    // Validate input
    if (!requestType || !requestedTime || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (!['clock_in', 'clock_out'].includes(requestType)) {
      return res.status(400).json({ message: 'Invalid request type' });
    }
    
    // Parse requested time and date
    const today = new Date();
    const requestedDate = today.toISOString().split('T')[0];
    
    // Combine today's date with the requested time
    const requestedDateTime = new Date(`${requestedDate}T${requestedTime}:00`);
    
    // Check if there's already a pending request for this user, date, and type
    const existingRequest = await pool.query(
      'SELECT request_id FROM clock_requests WHERE user_id = $1 AND requested_date = $2 AND request_type = $3 AND status = $4',
      [req.user.id, requestedDate, requestType, 'pending']
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        message: `You already have a pending ${requestType.replace('_', ' ')} request for this date` 
      });
    }
    
    // Create the clock request
    const result = await pool.query(
      `INSERT INTO clock_requests (user_id, request_type, requested_time, requested_date, reason, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [req.user.id, requestType, requestedDateTime, requestedDate, reason, 'pending']
    );
    
    const clockRequest = result.rows[0];
    
    res.status(201).json({
      message: 'Clock request submitted successfully',
      request: {
        id: clockRequest.request_id,
        requestType: clockRequest.request_type,
        requestedTime: clockRequest.requested_time,
        requestedDate: clockRequest.requested_date,
        reason: clockRequest.reason,
        status: clockRequest.status,
        createdAt: clockRequest.created_at
      }
    });
  } catch (error) {
    console.error('Clock request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's clock requests
router.get('/clock-requests', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Ensure page and limit are positive integers
    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.max(1, parseInt(limit) || 10);
    const offset = (pageInt - 1) * limitInt;
    
    let whereClause = 'WHERE user_id = $1';
    let params = [req.user.id];
    
    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }
    
    const result = await pool.query(
      `SELECT cr.*, u.first_name, u.last_name, a.first_name as admin_first_name, a.last_name as admin_last_name
       FROM clock_requests cr
       LEFT JOIN users u ON cr.user_id = u.id
       LEFT JOIN users a ON cr.reviewed_by = a.id
       ${whereClause}
       ORDER BY cr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitInt, offset]
    );
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clock_requests ${whereClause}`,
      params
    );
    
    const total = parseInt(countResult.rows[0].count);
    
    // Validate page number - if page is beyond available pages, return empty result
    const totalPages = Math.ceil(total / limitInt);
    if (pageInt > totalPages && total > 0) {
      return res.json({
        requests: [],
        pagination: {
          page: pageInt,
          limit: limitInt,
          total,
          pages: totalPages
        }
      });
    }
    
    res.json({
      requests: result.rows.map(req => ({
        id: req.request_id,
        requestType: req.request_type,
        requestedTime: req.requested_time,
        requestedDate: req.requested_date,
        reason: req.reason,
        status: req.status,
        adminNotes: req.admin_notes,
        processedAt: req.processed_at,
        createdAt: req.created_at,
        adminName: req.admin_first_name ? `${req.admin_first_name} ${req.admin_last_name}` : null
      })),
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
  } catch (error) {
    console.error('Get clock requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
