/**
 * Careers Management API Routes
 * Provides admin endpoints for managing job positions, applications, and careers content
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads/resumes');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// ============================================================================
// JOB POSITIONS MANAGEMENT
// ============================================================================

// Get all job positions with filtering and pagination
router.get('/jobs', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      department,
      location,
      type,
      experience_level,
      is_active = 'all',
      search = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT jp.*, 
             u1.first_name as created_by_name, u1.last_name as created_by_lastname,
             u2.first_name as updated_by_name, u2.last_name as updated_by_lastname,
             COUNT(ja.id) as application_count
      FROM job_positions jp
      LEFT JOIN users u1 ON jp.created_by = u1.id
      LEFT JOIN users u2 ON jp.updated_by = u2.id
      LEFT JOIN job_applications ja ON jp.id = ja.job_position_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND jp.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (location) {
      query += ` AND jp.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (type) {
      query += ` AND jp.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (experience_level) {
      query += ` AND jp.experience_level = $${paramIndex}`;
      params.push(experience_level);
      paramIndex++;
    }

    if (is_active !== 'all') {
      query += ` AND jp.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      query += ` AND (jp.title ILIKE $${paramIndex} OR jp.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY jp.id, u1.first_name, u1.last_name, u2.first_name, u2.last_name`;
    query += ` ORDER BY jp.featured DESC, jp.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT jp.id) as total
      FROM job_positions jp
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    let countParamIndex = 1;

    if (department) {
      countQuery += ` AND jp.department = $${countParamIndex}`;
      countParamIndex++;
    }
    if (location) {
      countQuery += ` AND jp.location ILIKE $${countParamIndex}`;
      countParamIndex++;
    }
    if (type) {
      countQuery += ` AND jp.type = $${countParamIndex}`;
      countParamIndex++;
    }
    if (experience_level) {
      countQuery += ` AND jp.experience_level = $${countParamIndex}`;
      countParamIndex++;
    }
    if (is_active !== 'all') {
      countQuery += ` AND jp.is_active = $${countParamIndex}`;
      countParamIndex++;
    }
    if (search) {
      countQuery += ` AND (jp.title ILIKE $${countParamIndex} OR jp.description ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      jobs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job position
router.get('/jobs/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT jp.*, 
             u1.first_name as created_by_name, u1.last_name as created_by_lastname,
             u2.first_name as updated_by_name, u2.last_name as updated_by_lastname,
             COUNT(ja.id) as application_count
      FROM job_positions jp
      LEFT JOIN users u1 ON jp.created_by = u1.id
      LEFT JOIN users u2 ON jp.updated_by = u2.id
      LEFT JOIN job_applications ja ON jp.id = ja.job_position_id
      WHERE jp.id = $1
      GROUP BY jp.id, u1.first_name, u1.last_name, u2.first_name, u2.last_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job position not found' });
    }

    res.json({ job: result.rows[0] });

  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new job position
router.post('/jobs', auth, adminAuth, async (req, res) => {
  try {
    const {
      title,
      department,
      location,
      type,
      experience_level,
      salary_range_min,
      salary_range_max,
      salary_currency,
      description,
      requirements,
      responsibilities,
      benefits,
      is_remote,
      is_active,
      featured,
      application_deadline
    } = req.body;

    // Validation
    if (!title || !department || !location || !description) {
      return res.status(400).json({
        message: 'Title, department, location, and description are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO job_positions (
        title, department, location, type, experience_level,
        salary_range_min, salary_range_max, salary_currency,
        description, requirements, responsibilities, benefits,
        is_remote, is_active, featured, application_deadline,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
      RETURNING *
    `, [
      title, department, location, type || 'full-time', experience_level || 'mid',
      salary_range_min, salary_range_max, salary_currency || 'USD',
      description, requirements || [], responsibilities || [], benefits || [],
      is_remote || false, is_active !== false, featured || false, application_deadline,
      req.user.id
    ]);

    res.status(201).json({
      message: 'Job position created successfully',
      job: result.rows[0]
    });

  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update job position
router.put('/jobs/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      department,
      location,
      type,
      experience_level,
      salary_range_min,
      salary_range_max,
      salary_currency,
      description,
      requirements,
      responsibilities,
      benefits,
      is_remote,
      is_active,
      featured,
      application_deadline
    } = req.body;

    console.log('🔍 PUT /jobs/:id - Starting job update');
    console.log('Job ID:', id);
    console.log('User ID:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const result = await pool.query(`
      UPDATE job_positions SET
        title = $1, department = $2, location = $3, type = $4, experience_level = $5,
        salary_range_min = $6, salary_range_max = $7, salary_currency = $8,
        description = $9, requirements = $10, responsibilities = $11, benefits = $12,
        is_remote = $13, is_active = $14, featured = $15, application_deadline = $16,
        updated_by = $17, updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `, [
      title, department, location, type, experience_level,
      salary_range_min, salary_range_max, salary_currency,
      description, requirements, responsibilities, benefits,
      is_remote, is_active, featured, application_deadline,
      req.user.id, id
    ]);

    console.log('✅ Job update successful, rows affected:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('❌ No job found with ID:', id);
      return res.status(404).json({ message: 'Job position not found' });
    }

    console.log('✅ Job updated successfully:', result.rows[0]);

    res.json({
      message: 'Job position updated successfully',
      job: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Update job error:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Full error:', error);
    res.status(500).json({ message: 'Something went wrong!', error: error.message });
  }
});

// Delete job position
router.delete('/jobs/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job has applications
    const applicationsResult = await pool.query(
      'SELECT COUNT(*) as count FROM job_applications WHERE job_position_id = $1',
      [id]
    );

    const applicationCount = parseInt(applicationsResult.rows[0].count);

    if (applicationCount > 0) {
      return res.status(400).json({
        message: `Cannot delete job position with ${applicationCount} applications. Please archive it instead.`
      });
    }

    const result = await pool.query('DELETE FROM job_positions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job position not found' });
    }

    res.json({ message: 'Job position deleted successfully' });

  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// JOB APPLICATIONS MANAGEMENT
// ============================================================================

// Get all job applications with filtering and pagination
router.get('/applications', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      job_id,
      status,
      search = '',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT ja.*, jp.title as job_title, jp.department, jp.location as job_location,
             u.first_name as reviewed_by_name, u.last_name as reviewed_by_lastname
      FROM job_applications ja
      JOIN job_positions jp ON ja.job_position_id = jp.id
      LEFT JOIN users u ON ja.reviewed_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (job_id) {
      query += ` AND ja.job_position_id = $${paramIndex}`;
      params.push(job_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND ja.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (ja.first_name ILIKE $${paramIndex} OR ja.last_name ILIKE $${paramIndex} OR ja.email ILIKE $${paramIndex} OR jp.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sorting
    const allowedSortFields = ['created_at', 'first_name', 'last_name', 'status', 'job_title'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField === 'job_title' ? 'jp.title' : 'ja.' + sortField} ${sortDirection}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM job_applications ja
      JOIN job_positions jp ON ja.job_position_id = jp.id
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2);
    let countParamIndex = 1;

    if (job_id) {
      countQuery += ` AND ja.job_position_id = $${countParamIndex}`;
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND ja.status = $${countParamIndex}`;
      countParamIndex++;
    }
    if (search) {
      countQuery += ` AND (ja.first_name ILIKE $${countParamIndex} OR ja.last_name ILIKE $${countParamIndex} OR ja.email ILIKE $${countParamIndex} OR jp.title ILIKE $${countParamIndex})`;
      countParamIndex++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      applications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single application details
router.get('/applications/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT ja.*, jp.title as job_title, jp.department, jp.location as job_location,
             jp.description as job_description,
             u.first_name as reviewed_by_name, u.last_name as reviewed_by_lastname
      FROM job_applications ja
      JOIN job_positions jp ON ja.job_position_id = jp.id
      LEFT JOIN users u ON ja.reviewed_by = u.id
      WHERE ja.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ application: result.rows[0] });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application status
router.put('/applications/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const allowedStatuses = ['pending', 'reviewing', 'interviewed', 'rejected', 'hired'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE job_applications 
      SET status = $1, admin_notes = $2, reviewed_by = $3, 
          reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, admin_notes || '', req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({
      message: 'Application status updated successfully',
      application: result.rows[0]
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download resume
router.get('/applications/:id/resume', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT resume_filename, resume_path FROM job_applications WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const { resume_filename, resume_path } = result.rows[0];

    if (!resume_path) {
      return res.status(404).json({ message: 'No resume found for this application' });
    }

    const fullPath = path.resolve(resume_path);
    
    try {
      await fs.access(fullPath);
      res.download(fullPath, resume_filename);
    } catch (fileError) {
      res.status(404).json({ message: 'Resume file not found on server' });
    }

  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// ANALYTICS ENDPOINT
// ============================================================================

// Get careers analytics data
router.get('/analytics', auth, adminAuth, async (req, res) => {
  console.log('🎯 Analytics endpoint hit:', req.method, req.url);
  console.log('🔑 Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('👤 User:', req.user);
  
  try {
    // Get real job statistics
    const jobStatsQuery = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_jobs,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_jobs
      FROM job_positions
    `;

    // Get real application statistics
    const applicationStatsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
        COUNT(CASE WHEN status IN ('reviewing', 'interviewed', 'hired') THEN 1 END) as approved_applications,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications,
        COUNT(CASE WHEN status = 'hired' THEN 1 END) as hired_applications,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as applications_this_month
      FROM job_applications
    `;

    // Get department statistics
    const departmentStatsQuery = `
      SELECT 
        department,
        COUNT(*) as job_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM job_positions
      GROUP BY department
      ORDER BY job_count DESC
    `;

    // Execute all queries in parallel
    const [jobStatsResult, applicationStatsResult, departmentStatsResult] = await Promise.all([
      pool.query(jobStatsQuery),
      pool.query(applicationStatsQuery),
      pool.query(departmentStatsQuery)
    ]);

    const jobStats = jobStatsResult.rows[0];
    const applicationStats = applicationStatsResult.rows[0];
    const departments = departmentStatsResult.rows;

    // Calculate conversion rate (applications to hired)
    const conversionRate = applicationStats.total_applications > 0 
      ? ((applicationStats.hired_applications / applicationStats.total_applications) * 100).toFixed(1)
      : 0;

    const analytics = {
      jobs: {
        total_jobs: parseInt(jobStats.total_jobs) || 0,
        active_jobs: parseInt(jobStats.active_jobs) || 0,
        inactive_jobs: parseInt(jobStats.inactive_jobs) || 0,
        recent_jobs: parseInt(jobStats.recent_jobs) || 0
      },
      applications: {
        total_applications: parseInt(applicationStats.total_applications) || 0,
        pending_applications: parseInt(applicationStats.pending_applications) || 0,
        approved_applications: parseInt(applicationStats.approved_applications) || 0,
        rejected_applications: parseInt(applicationStats.rejected_applications) || 0,
        hired_applications: parseInt(applicationStats.hired_applications) || 0
      },
      overview: {
        views_this_month: 0, // This would require page view tracking
        applications_this_month: parseInt(applicationStats.applications_this_month) || 0,
        conversion_rate: parseFloat(conversionRate) || 0
      },
      departments: departments.map(dept => ({
        department: dept.department,
        job_count: parseInt(dept.job_count),
        active_count: parseInt(dept.active_count)
      })),
      timestamp: new Date().toISOString(),
      user: req.user?.id
    };
    
    console.log('✅ Sending real analytics response:', analytics);
    res.json(analytics);
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
