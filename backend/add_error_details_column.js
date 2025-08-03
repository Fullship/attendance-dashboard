require('dotenv').config();
const pool = require('./config/database');

async function addErrorDetailsColumn() {
  try {
    console.log('Adding error_details column to file_uploads table...');
    
    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' AND column_name = 'error_details'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Add the error_details column
      await pool.query(`
        ALTER TABLE file_uploads 
        ADD COLUMN error_details TEXT
      `);
      console.log('✅ Added error_details column');
    } else {
      console.log('✅ error_details column already exists');
    }
    
    // Verify the change
    const updatedColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'file_uploads' 
      ORDER BY ordinal_position
    `);
    
    console.log('Updated file_uploads table columns:');
    updatedColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
  } finally {
    await pool.end();
  }
}

addErrorDetailsColumn();
