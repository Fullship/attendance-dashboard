require('dotenv').config();

const pool = require('./config/database');

async function fixFileUploadsStatus() {
  try {
    console.log('Checking current file_uploads status field...');
    
    // Check current structure
    const currentStructure = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' AND column_name = 'status'
    `);
    
    console.log('Current file_uploads status field:', currentStructure.rows[0]);
    
    // Increase the status field length
    console.log('Updating file_uploads status field to VARCHAR(50)...');
    await pool.query(`
      ALTER TABLE file_uploads 
      ALTER COLUMN status TYPE VARCHAR(50)
    `);
    
    // Verify the change
    const updatedStructure = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' AND column_name = 'status'
    `);
    
    console.log('Updated file_uploads status field:', updatedStructure.rows[0]);
    
    // Also check attendance_records status field
    const attendanceStatus = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'attendance_records' AND column_name = 'status'
    `);
    
    console.log('Attendance_records status field:', attendanceStatus.rows[0]);
    
    console.log('✅ Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error.message);
  } finally {
    await pool.end();
  }
}

fixFileUploadsStatus();
