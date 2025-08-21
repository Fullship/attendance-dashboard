/**
 * Careers Content Management API Routes - Part 2
 * Provides admin endpoints for managing careers page content, benefits, and testimonials
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// ============================================================================
// CAREERS PAGE CONTENT MANAGEMENT
// ============================================================================

// Get all careers content sections
router.get('/content', auth, adminAuth, async (req, res) => {
  try {
    const { section_name, is_active = 'all' } = req.query;

    let query = `
      SELECT cc.*, 
             u1.first_name as created_by_name, u1.last_name as created_by_lastname,
             u2.first_name as updated_by_name, u2.last_name as updated_by_lastname
      FROM careers_content cc
      LEFT JOIN users u1 ON cc.created_by = u1.id
      LEFT JOIN users u2 ON cc.updated_by = u2.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (section_name) {
      query += ` AND cc.section_name = $${paramIndex}`;
      params.push(section_name);
      paramIndex++;
    }

    if (is_active !== 'all') {
      query += ` AND cc.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY cc.display_order ASC, cc.section_name ASC`;

    const result = await pool.query(query, params);

    res.json({ content: result.rows });

  } catch (error) {
    console.error('Get careers content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single content section
router.get('/content/:section_name', auth, adminAuth, async (req, res) => {
  try {
    const { section_name } = req.params;

    const result = await pool.query(`
      SELECT cc.*, 
             u1.first_name as created_by_name, u1.last_name as created_by_lastname,
             u2.first_name as updated_by_name, u2.last_name as updated_by_lastname
      FROM careers_content cc
      LEFT JOIN users u1 ON cc.created_by = u1.id
      LEFT JOIN users u2 ON cc.updated_by = u2.id
      WHERE cc.section_name = $1
    `, [section_name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }

    res.json({ content: result.rows[0] });

  } catch (error) {
    console.error('Get content section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update content section
router.put('/content/:section_name', auth, adminAuth, async (req, res) => {
  try {
    const { section_name } = req.params;
    const {
      title,
      subtitle,
      content_html,
      content_json,
      media_urls,
      is_active,
      display_order
    } = req.body;

    // Check if section exists
    const existing = await pool.query(
      'SELECT id FROM careers_content WHERE section_name = $1',
      [section_name]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(`
        UPDATE careers_content SET
          title = $1, subtitle = $2, content_html = $3, content_json = $4,
          media_urls = $5, is_active = $6, display_order = $7,
          updated_by = $8, updated_at = CURRENT_TIMESTAMP
        WHERE section_name = $9
        RETURNING *
      `, [
        title, subtitle, content_html, content_json ? JSON.stringify(content_json) : null,
        media_urls || [], is_active !== false, display_order || 0,
        req.user.id, section_name
      ]);
    } else {
      // Create new
      result = await pool.query(`
        INSERT INTO careers_content (
          section_name, title, subtitle, content_html, content_json,
          media_urls, is_active, display_order, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING *
      `, [
        section_name, title, subtitle, content_html, content_json ? JSON.stringify(content_json) : null,
        media_urls || [], is_active !== false, display_order || 0, req.user.id
      ]);
    }

    res.json({
      message: 'Content section updated successfully',
      content: result.rows[0]
    });

  } catch (error) {
    console.error('Update content section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete content section
router.delete('/content/:section_name', auth, adminAuth, async (req, res) => {
  try {
    const { section_name } = req.params;

    const result = await pool.query(
      'DELETE FROM careers_content WHERE section_name = $1 RETURNING *',
      [section_name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }

    res.json({ message: 'Content section deleted successfully' });

  } catch (error) {
    console.error('Delete content section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// COMPANY BENEFITS MANAGEMENT
// ============================================================================

// Get all benefits
router.get('/benefits', auth, adminAuth, async (req, res) => {
  try {
    const { category, is_active = 'all' } = req.query;

    let query = `
      SELECT cb.*, u.first_name as created_by_name, u.last_name as created_by_lastname
      FROM company_benefits cb
      LEFT JOIN users u ON cb.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND cb.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (is_active !== 'all') {
      query += ` AND cb.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY cb.display_order ASC, cb.title ASC`;

    const result = await pool.query(query, params);

    res.json({ benefits: result.rows });

  } catch (error) {
    console.error('Get benefits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new benefit
router.post('/benefits', auth, adminAuth, async (req, res) => {
  try {
    const { title, description, icon, category, is_active, display_order } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const result = await pool.query(`
      INSERT INTO company_benefits (
        title, description, icon, category, is_active, display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      title, description, icon, category || 'general', 
      is_active !== false, display_order || 0, req.user.id
    ]);

    res.status(201).json({
      message: 'Benefit created successfully',
      benefit: result.rows[0]
    });

  } catch (error) {
    console.error('Create benefit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update benefit
router.put('/benefits/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon, category, is_active, display_order } = req.body;

    const result = await pool.query(`
      UPDATE company_benefits SET
        title = $1, description = $2, icon = $3, category = $4,
        is_active = $5, display_order = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [title, description, icon, category, is_active, display_order, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    res.json({
      message: 'Benefit updated successfully',
      benefit: result.rows[0]
    });

  } catch (error) {
    console.error('Update benefit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete benefit
router.delete('/benefits/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM company_benefits WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    res.json({ message: 'Benefit deleted successfully' });

  } catch (error) {
    console.error('Delete benefit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// EMPLOYEE TESTIMONIALS MANAGEMENT
// ============================================================================

// Get all testimonials
router.get('/testimonials', auth, adminAuth, async (req, res) => {
  try {
    const { department, is_featured, is_active = 'all' } = req.query;

    let query = `
      SELECT et.*, u.first_name as created_by_name, u.last_name as created_by_lastname
      FROM employee_testimonials et
      LEFT JOIN users u ON et.created_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND et.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (is_featured !== undefined) {
      query += ` AND et.is_featured = $${paramIndex}`;
      params.push(is_featured === 'true');
      paramIndex++;
    }

    if (is_active !== 'all') {
      query += ` AND et.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY et.is_featured DESC, et.display_order ASC, et.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ testimonials: result.rows });

  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new testimonial
router.post('/testimonials', auth, adminAuth, async (req, res) => {
  try {
    const {
      employee_name,
      job_title,
      department,
      photo_url,
      testimonial_text,
      rating,
      is_featured,
      is_active,
      display_order
    } = req.body;

    if (!employee_name || !job_title || !testimonial_text) {
      return res.status(400).json({
        message: 'Employee name, job title, and testimonial text are required'
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const result = await pool.query(`
      INSERT INTO employee_testimonials (
        employee_name, job_title, department, photo_url, testimonial_text,
        rating, is_featured, is_active, display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      employee_name, job_title, department, photo_url, testimonial_text,
      rating, is_featured || false, is_active !== false, display_order || 0, req.user.id
    ]);

    res.status(201).json({
      message: 'Testimonial created successfully',
      testimonial: result.rows[0]
    });

  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update testimonial
router.put('/testimonials/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_name,
      job_title,
      department,
      photo_url,
      testimonial_text,
      rating,
      is_featured,
      is_active,
      display_order
    } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const result = await pool.query(`
      UPDATE employee_testimonials SET
        employee_name = $1, job_title = $2, department = $3, photo_url = $4,
        testimonial_text = $5, rating = $6, is_featured = $7, is_active = $8,
        display_order = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      employee_name, job_title, department, photo_url, testimonial_text,
      rating, is_featured, is_active, display_order, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.json({
      message: 'Testimonial updated successfully',
      testimonial: result.rows[0]
    });

  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete testimonial
router.delete('/testimonials/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM employee_testimonials WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    res.json({ message: 'Testimonial deleted successfully' });

  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

// Get careers analytics
router.get('/analytics', auth, adminAuth, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;

    // Base date filter
    let dateFilter = 'EXTRACT(YEAR FROM created_at) = $1';
    const params = [year];
    let paramIndex = 2;

    if (month) {
      dateFilter += ` AND EXTRACT(MONTH FROM created_at) = $${paramIndex}`;
      params.push(month);
      paramIndex++;
    }

    // Get job positions stats
    const jobStatsQuery = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_jobs,
        COUNT(CASE WHEN featured = true THEN 1 END) as featured_jobs,
        COUNT(DISTINCT department) as departments_count,
        COUNT(DISTINCT location) as locations_count
      FROM job_positions
      WHERE ${dateFilter}
    `;

    // Get applications stats
    const applicationStatsQuery = `
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
        COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing_applications,
        COUNT(CASE WHEN status = 'interviewed' THEN 1 END) as interviewed_applications,
        COUNT(CASE WHEN status = 'hired' THEN 1 END) as hired_applications,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications
      FROM job_applications
      WHERE ${dateFilter}
    `;

    // Get top departments by applications
    const departmentStatsQuery = `
      SELECT 
        jp.department,
        COUNT(ja.id) as application_count,
        COUNT(DISTINCT jp.id) as job_count
      FROM job_positions jp
      LEFT JOIN job_applications ja ON jp.id = ja.job_position_id
      WHERE jp.${dateFilter}
      GROUP BY jp.department
      ORDER BY application_count DESC
      LIMIT 10
    `;

    // Get application trends (last 12 months)
    const trendQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as applications
      FROM job_applications
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;

    const [jobStats, applicationStats, departmentStats, trends] = await Promise.all([
      pool.query(jobStatsQuery, params),
      pool.query(applicationStatsQuery, params),
      pool.query(departmentStatsQuery, params),
      pool.query(trendQuery)
    ]);

    res.json({
      jobStats: jobStats.rows[0],
      applicationStats: applicationStats.rows[0],
      departmentStats: departmentStats.rows,
      applicationTrends: trends.rows,
      period: { year, month: month || 'all' }
    });

  } catch (error) {
    console.error('Get careers analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get application status summary
router.get('/applications/summary', auth, adminAuth, async (req, res) => {
  try {
    const { job_id } = req.query;

    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM job_applications ja
    `;

    const params = [];
    if (job_id) {
      query += ' WHERE ja.job_position_id = $1';
      params.push(job_id);
    }

    query += `
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'reviewing' THEN 2
          WHEN 'interviewed' THEN 3
          WHEN 'hired' THEN 4
          WHEN 'rejected' THEN 5
          ELSE 6
        END
    `;

    const result = await pool.query(query, params);

    res.json({ summary: result.rows });

  } catch (error) {
    console.error('Get application summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
