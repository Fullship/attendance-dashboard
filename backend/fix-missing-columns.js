// Load environment variables
require('dotenv').config({ path: '../.env.local' });

const pool = require('./config/database');

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns...');
    
    // Check if file_uploads has upload_date column
    const uploadDateCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      AND column_name = 'upload_date'
    `);
    
    if (uploadDateCheck.rows.length === 0) {
      console.log('➕ Adding upload_date to file_uploads table...');
      await pool.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added upload_date column to file_uploads');
    } else {
      console.log('✅ upload_date column already exists in file_uploads');
    }
    
    // Check if locations has is_active column
    const locationActiveCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND column_name = 'is_active'
    `);
    
    if (locationActiveCheck.rows.length === 0) {
      console.log('➕ Adding is_active to locations table...');
      await pool.query(`
        ALTER TABLE locations 
        ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ Added is_active column to locations');
    } else {
      console.log('✅ is_active column already exists in locations');
    }
    
    console.log('🎉 All missing columns have been added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
