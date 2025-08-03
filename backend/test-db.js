const pool = require('./config/database');

async function checkDatabase() {
  try {
    console.log('Checking locations table...');
    const locationsResult = await pool.query('SELECT * FROM locations ORDER BY id LIMIT 5');
    console.log('Locations:', locationsResult.rows);
    
    console.log('\nChecking users table...');
    const usersResult = await pool.query('SELECT id, first_name, last_name, email FROM users ORDER BY id LIMIT 5');
    console.log('Users:', usersResult.rows);

    console.log('\nChecking timezone endpoints...');
    console.log('Testing timezone processor...');
    
    const { TimezoneAttendanceProcessor } = require('./utils/timezone-processor');
    const processor = new TimezoneAttendanceProcessor();
    const summary = processor.getTimezoneLocationSummary();
    console.log('Timezone summary:', summary);
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
