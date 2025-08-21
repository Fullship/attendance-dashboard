/**
 * Create careers-related database tables
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true'
});

async function createCareersTables() {
  try {
    console.log('🏗️ Creating careers-related tables...');

    // 1. Job Positions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_positions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        location VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'full-time', -- full-time, part-time, contract, internship
        experience_level VARCHAR(50) NOT NULL DEFAULT 'mid', -- entry, junior, mid, senior, lead
        salary_range_min INTEGER,
        salary_range_max INTEGER,
        salary_currency VARCHAR(3) DEFAULT 'USD',
        description TEXT NOT NULL,
        requirements TEXT[] DEFAULT '{}',
        responsibilities TEXT[] DEFAULT '{}',
        benefits TEXT[] DEFAULT '{}',
        is_remote BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        featured BOOLEAN DEFAULT false,
        application_deadline DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id)
      );
    `);

    // 2. Job Applications Table  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        job_position_id INTEGER REFERENCES job_positions(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        location VARCHAR(100),
        portfolio_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        cover_letter TEXT,
        resume_filename VARCHAR(255),
        resume_path VARCHAR(500),
        experience_years INTEGER,
        salary_expectation INTEGER,
        availability_date DATE,
        status VARCHAR(50) DEFAULT 'pending', -- pending, reviewing, interviewed, rejected, hired
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP
      );
    `);

    // 3. Careers Page Content Table (for dynamic content management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS careers_content (
        id SERIAL PRIMARY KEY,
        section_name VARCHAR(100) NOT NULL UNIQUE, -- hero, about, benefits, culture, etc.
        title VARCHAR(255),
        subtitle VARCHAR(500),
        content_html TEXT,
        content_json JSONB, -- for structured content like benefits, testimonials
        media_urls TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id)
      );
    `);

    // 4. Company Benefits Table (separate for easier management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_benefits (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100), -- icon name or emoji
        category VARCHAR(100) DEFAULT 'general', -- health, financial, time-off, professional, perks
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // 5. Employee Testimonials Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_testimonials (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        photo_url VARCHAR(500),
        testimonial_text TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_positions_active ON job_positions(is_active) WHERE is_active = true;');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_positions_department ON job_positions(department);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_positions_location ON job_positions(location);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_positions_type ON job_positions(type);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(job_position_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_careers_content_section ON careers_content(section_name);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_careers_content_active ON careers_content(is_active) WHERE is_active = true;');

    // Insert sample data
    console.log('📝 Inserting sample careers content...');
    
    // Sample job positions
    await pool.query(`
      INSERT INTO job_positions (title, department, location, type, experience_level, salary_range_min, salary_range_max, description, requirements, responsibilities, is_remote, featured, created_by)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13),
      ($14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      ON CONFLICT DO NOTHING
    `, [
      'Senior Full Stack Developer', 'Engineering', 'Remote', 'full-time', 'senior', 90000, 130000,
      'Join our engineering team to build cutting-edge attendance management solutions.',
      ['5+ years React/Node.js experience', 'PostgreSQL expertise', 'AWS/Docker knowledge'],
      ['Develop new features', 'Code reviews', 'Mentor junior developers'], 
      true, true, 1,
      
      'Product Designer', 'Design', 'San Francisco, CA', 'full-time', 'mid', 75000, 105000,
      'Create beautiful and intuitive user experiences for our attendance platform.',
      ['3+ years UI/UX design', 'Figma proficiency', 'Design systems experience'],
      ['Design user interfaces', 'Conduct user research', 'Maintain design system'],
      false, false, 1
    ]);

    // Sample careers content sections
    await pool.query(`
      INSERT INTO careers_content (section_name, title, subtitle, content_html, is_active, display_order, created_by)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7),
      ($8, $9, $10, $11, $12, $13, $14),
      ($15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (section_name) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        content_html = EXCLUDED.content_html,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'hero', 'Join Our Mission', 'Build the future of workforce management with us', 
      '<p>We\'re looking for passionate individuals who want to make a difference in how companies manage their teams.</p>', 
      true, 1, 1,
      
      'company_intro', 'About Fullship', 'Innovation meets opportunity', 
      '<p>At Fullship, we believe that great products come from great teams. Our mission is to simplify workforce management and help businesses focus on what matters most - their people.</p>',
      true, 2, 1,
      
      'culture', 'Our Culture', 'Where innovation thrives', 
      '<p>We foster a culture of continuous learning, collaboration, and innovation. Every voice matters, and every idea has the potential to shape our product.</p>',
      true, 3, 1
    ]);

    // Sample benefits
    await pool.query(`
      INSERT INTO company_benefits (title, description, icon, category, display_order, created_by)
      VALUES 
      ($1, $2, $3, $4, $5, $6),
      ($7, $8, $9, $10, $11, $12),
      ($13, $14, $15, $16, $17, $18),
      ($19, $20, $21, $22, $23, $24)
      ON CONFLICT DO NOTHING
    `, [
      'Health Insurance', 'Comprehensive medical, dental, and vision coverage', '🏥', 'health', 1, 1,
      'Remote Work', 'Work from anywhere with flexible hours', '🏠', 'time-off', 2, 1,
      'Learning Budget', '$2000 annual budget for courses and conferences', '📚', 'professional', 3, 1,
      'Stock Options', 'Equity participation in company growth', '💰', 'financial', 4, 1
    ]);

    // Sample testimonials
    await pool.query(`
      INSERT INTO employee_testimonials (employee_name, job_title, department, testimonial_text, rating, is_featured, display_order, created_by)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8),
      ($9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT DO NOTHING
    `, [
      'Sarah Chen', 'Senior Developer', 'Engineering', 
      'Working at Fullship has been an incredible journey. The team is supportive, the challenges are meaningful, and the growth opportunities are endless.',
      5, true, 1, 1,
      
      'Alex Rodriguez', 'Product Manager', 'Product',
      'The culture here promotes innovation and collaboration. I love how my ideas are heard and implemented.',
      5, true, 2, 1
    ]);

    console.log('✅ All careers tables created successfully!');
    console.log('📋 Created tables:');
    console.log('   - job_positions (for managing job listings)');
    console.log('   - job_applications (for storing applications)');
    console.log('   - careers_content (for dynamic page content)');
    console.log('   - company_benefits (for managing benefits)');
    console.log('   - employee_testimonials (for employee stories)');
    console.log('📊 Created indexes for performance optimization');
    console.log('📝 Inserted sample data for testing');

  } catch (error) {
    console.error('❌ Error creating careers tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createCareersTables()
    .then(() => {
      console.log('🎉 Careers database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createCareersTables };
