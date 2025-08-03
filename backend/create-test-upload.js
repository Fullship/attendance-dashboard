const { Pool } = require('pg');

const pool = new Pool({
  user: 'salarjirjees',
  host: 'localhost',
  database: 'attendance_dashboard',
  password: '',
  port: 5432,
});

async function createTestUpload() {
  try {
    // First, let's create a test upload with errors
    const errorDetails = [
      "Row 1: Invalid email format 'invalid-email'",
      "Row 3: Invalid date format 'invalid-date'", 
      "Row 4: Invalid time format '25:00' for clock_in",
      "Row 6: Invalid status 'invalid-status', must be one of: present, absent, late, early_leave",
      "Row 7: Missing required field 'clock_in'"
    ];

    const result = await pool.query(
      `INSERT INTO file_uploads (
        original_name, 
        file_path, 
        status, 
        records_processed, 
        errors_count, 
        error_details,
        upload_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'test-with-errors.csv',
        '/uploads/test-with-errors.csv', 
        'completed_with_errors',
        8,
        5,
        JSON.stringify(errorDetails),
        new Date()
      ]
    );

    console.log('Created test upload with ID:', result.rows[0].id);
    console.log('Error details stored:', errorDetails);
    
  } catch (error) {
    console.error('Error creating test upload:', error);
  }
  
  await pool.end();
}

createTestUpload().catch(console.error);
