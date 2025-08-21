/**
 * Public Careers API Routes
 * Provides public endpoints for the careers page and job applications
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database');

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
// PUBLIC JOB LISTINGS
// ============================================================================

// Get all active job positions
router.get('/jobs', async (req, res) => {
  try {
    const {
      department,
      location,
      type,
      experience_level,
      is_remote,
      featured_only = 'false'
    } = req.query;

    let query = `
      SELECT 
        id, title, department, location, type, experience_level,
        salary_range_min, salary_range_max, salary_currency,
        description, requirements, responsibilities, benefits,
        is_remote, featured, application_deadline, created_at
      FROM job_positions 
      WHERE is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (location) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (experience_level) {
      query += ` AND experience_level = $${paramIndex}`;
      params.push(experience_level);
      paramIndex++;
    }

    if (is_remote !== undefined) {
      query += ` AND is_remote = $${paramIndex}`;
      params.push(is_remote === 'true');
      paramIndex++;
    }

    if (featured_only === 'true') {
      query += ` AND featured = true`;
    }

    query += ` ORDER BY featured DESC, created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ jobs: result.rows });

  } catch (error) {
    console.error('Get public jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single job position details
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id, title, department, location, type, experience_level,
        salary_range_min, salary_range_max, salary_currency,
        description, requirements, responsibilities, benefits,
        is_remote, featured, application_deadline, created_at
      FROM job_positions 
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job position not found' });
    }

    res.json({ job: result.rows[0] });

  } catch (error) {
    console.error('Get public job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get job filters (for filter dropdowns)
router.get('/jobs/filters/options', async (req, res) => {
  try {
    const departmentsQuery = `
      SELECT DISTINCT department 
      FROM job_positions 
      WHERE is_active = true 
      ORDER BY department
    `;

    const locationsQuery = `
      SELECT DISTINCT location 
      FROM job_positions 
      WHERE is_active = true 
      ORDER BY location
    `;

    const typesQuery = `
      SELECT DISTINCT type 
      FROM job_positions 
      WHERE is_active = true 
      ORDER BY type
    `;

    const experienceLevelsQuery = `
      SELECT DISTINCT experience_level 
      FROM job_positions 
      WHERE is_active = true 
      ORDER BY 
        CASE experience_level
          WHEN 'entry' THEN 1
          WHEN 'junior' THEN 2
          WHEN 'mid' THEN 3
          WHEN 'senior' THEN 4
          WHEN 'lead' THEN 5
          ELSE 6
        END
    `;

    const [departments, locations, types, experienceLevels] = await Promise.all([
      pool.query(departmentsQuery),
      pool.query(locationsQuery),
      pool.query(typesQuery),
      pool.query(experienceLevelsQuery)
    ]);

    res.json({
      departments: departments.rows.map(row => row.department),
      locations: locations.rows.map(row => row.location),
      types: types.rows.map(row => row.type),
      experienceLevels: experienceLevels.rows.map(row => row.experience_level)
    });

  } catch (error) {
    console.error('Get job filters error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// CAREERS PAGE CONTENT
// ============================================================================

// Get all active careers content
router.get('/content', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT section_name, title, subtitle, content_html, content_json, media_urls
      FROM careers_content 
      WHERE is_active = true 
      ORDER BY display_order ASC, section_name ASC
    `);

    // Transform to object with section names as keys
    const content = {};
    result.rows.forEach(row => {
      content[row.section_name] = {
        title: row.title,
        subtitle: row.subtitle,
        content_html: row.content_html,
        content_json: row.content_json,
        media_urls: row.media_urls
      };
    });

    res.json({ content });

  } catch (error) {
    console.error('Get careers content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get company benefits
router.get('/benefits', async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT title, description, icon, category
      FROM company_benefits 
      WHERE is_active = true
    `;

    const params = [];
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ` ORDER BY display_order ASC, title ASC`;

    const result = await pool.query(query, params);

    res.json({ benefits: result.rows });

  } catch (error) {
    console.error('Get benefits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee testimonials
router.get('/testimonials', async (req, res) => {
  try {
    const { featured_only = 'false' } = req.query;

    let query = `
      SELECT employee_name, job_title, department, photo_url, 
             testimonial_text, rating
      FROM employee_testimonials 
      WHERE is_active = true
    `;

    if (featured_only === 'true') {
      query += ` AND is_featured = true`;
    }

    query += ` ORDER BY is_featured DESC, display_order ASC, created_at DESC`;

    const result = await pool.query(query);

    res.json({ testimonials: result.rows });

  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// JOB APPLICATIONS
// ============================================================================

// Submit job application
router.post('/jobs/:jobId/apply', upload.single('resume'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      location,
      portfolio_url,
      linkedin_url,
      cover_letter,
      experience_years,
      salary_expectation,
      availability_date
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        message: 'First name, last name, and email are required'
      });
    }

    // Check if job exists and is active
    const jobResult = await pool.query(
      'SELECT id, title FROM job_positions WHERE id = $1 AND is_active = true',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job position not found or no longer available' });
    }

    // Check for duplicate application
    const existingApplication = await pool.query(
      'SELECT id FROM job_applications WHERE job_position_id = $1 AND email = $2',
      [jobId, email]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(409).json({
        message: 'You have already applied for this position'
      });
    }

    // Handle resume file
    let resume_filename = null;
    let resume_path = null;

    if (req.file) {
      resume_filename = req.file.originalname;
      resume_path = req.file.path;
    }

    // Insert application
    const result = await pool.query(`
      INSERT INTO job_applications (
        job_position_id, first_name, last_name, email, phone, location,
        portfolio_url, linkedin_url, cover_letter, resume_filename, resume_path,
        experience_years, salary_expectation, availability_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, created_at
    `, [
      jobId, first_name, last_name, email, phone, location,
      portfolio_url, linkedin_url, cover_letter, resume_filename, resume_path,
      experience_years ? parseInt(experience_years) : null,
      salary_expectation ? parseInt(salary_expectation) : null,
      availability_date
    ]);

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: result.rows[0].id,
        job_title: jobResult.rows[0].title,
        submitted_at: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Submit application error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Check application status (optional - allows users to check their application)
router.get('/applications/status/:email/:jobId', async (req, res) => {
  try {
    const { email, jobId } = req.params;

    const result = await pool.query(`
      SELECT ja.status, ja.created_at, jp.title as job_title
      FROM job_applications ja
      JOIN job_positions jp ON ja.job_position_id = jp.id
      WHERE ja.email = $1 AND ja.job_position_id = $2
    `, [email, jobId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ application: result.rows[0] });

  } catch (error) {
    console.error('Check application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// STATISTICS (Public)
// ============================================================================

// Get public career statistics
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM job_positions WHERE is_active = true) as active_jobs,
        (SELECT COUNT(DISTINCT department) FROM job_positions WHERE is_active = true) as departments,
        (SELECT COUNT(DISTINCT location) FROM job_positions WHERE is_active = true) as locations,
        (SELECT COUNT(*) FROM job_applications WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_applications
    `;

    const result = await pool.query(statsQuery);

    res.json({ stats: result.rows[0] });

  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
