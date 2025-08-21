const { Pool } = require('pg');
require('dotenv').config({ path: '../.env.local' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function fixAdditionalColumns() {
  console.log('🔧 Fixing additional missing database columns...');
  
  try {
    // Check and add filename column to file_uploads table
    console.log('1. Checking file_uploads table...');
    const checkFilename = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' AND column_name = 'filename'
    `);
    
    if (checkFilename.rows.length === 0) {
      console.log('   ❌ Missing filename column, adding...');
      await pool.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN filename VARCHAR(255)
      `);
      console.log('   ✅ Added filename column');
    } else {
      console.log('   ✅ filename column already exists');
    }

    // Check and add updated_at column to locations table
    console.log('2. Checking locations table...');
    const checkUpdatedAt = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' AND column_name = 'updated_at'
    `);
    
    if (checkUpdatedAt.rows.length === 0) {
      console.log('   ❌ Missing updated_at column, adding...');
      await pool.query(`
        ALTER TABLE locations 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('   ✅ Added updated_at column');
    } else {
      console.log('   ✅ updated_at column already exists');
    }

    console.log('🎉 All additional columns fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdditionalColumns();
