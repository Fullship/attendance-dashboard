const { Pool } = require('pg');

const pool = new Pool({
  user: 'salarjirjees',
  host: 'localhost',
  database: 'attendance_dashboard',
  password: '',
  port: 5432,
});

async function testDuplicatePrevention() {
  try {
    console.log('=== Testing Duplicate Prevention ===');
    
    // Check if the database has attendance records
    const recordsResult = await pool.query(`
      SELECT user_id, date, COUNT(*) as record_count 
      FROM attendance_records 
      GROUP BY user_id, date 
      HAVING COUNT(*) > 1
      ORDER BY record_count DESC
      LIMIT 10
    `);
    
    console.log('Duplicate records (should be 0 if working correctly):');
    console.log(`Found ${recordsResult.rows.length} duplicate user-date combinations`);
    
    if (recordsResult.rows.length > 0) {
      console.log('Duplicate records found:');
      recordsResult.rows.forEach(row => {
        console.log(`- User ${row.user_id}, Date ${row.date}: ${row.record_count} records`);
      });
    } else {
      console.log('✅ No duplicate records found - duplicate prevention is working!');
    }
    
    console.log('\\n=== Testing Employee Stats Calculation ===');
    
    // Test the employee stats calculation
    const statsResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name,
             COUNT(ar.id) as total_records,
             COUNT(ar.id) FILTER (WHERE ar.status = 'present') as present_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'absent') as absent_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'late') as late_days,
             COUNT(ar.id) FILTER (WHERE ar.status = 'early_leave') as early_leave_days,
             AVG(ar.hours_worked) FILTER (WHERE ar.hours_worked > 0) as avg_hours,
             COUNT(DISTINCT ar.date) as unique_days
      FROM users u
      LEFT JOIN attendance_records ar ON u.id = ar.user_id 
        AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY u.last_name, u.first_name
      LIMIT 5
    `);
    
    console.log('Employee stats (last 30 days):');
    statsResult.rows.forEach(emp => {
      console.log(`\\n📊 ${emp.first_name} ${emp.last_name}:`);
      console.log(`   - Total Records: ${emp.total_records}`);
      console.log(`   - Present Days: ${emp.present_days}`);
      console.log(`   - Absent Days: ${emp.absent_days}`);
      console.log(`   - Late Days: ${emp.late_days}`);
      console.log(`   - Early Leave Days: ${emp.early_leave_days}`);
      console.log(`   - Unique Days: ${emp.unique_days}`);
      console.log(`   - Average Hours: ${emp.avg_hours ? parseFloat(emp.avg_hours).toFixed(2) + 'h' : 'N/A'}`);
    });
    
    console.log('\\n=== Recent Upload History ===');
    
    // Check recent uploads
    const uploadsResult = await pool.query(`
      SELECT fu.id, fu.original_name, fu.upload_date, fu.records_processed, 
             fu.errors_count, fu.status, u.first_name, u.last_name
      FROM file_uploads fu
      JOIN users u ON fu.uploaded_by = u.id
      ORDER BY fu.upload_date DESC
      LIMIT 5
    `);
    
    console.log('Recent uploads:');
    uploadsResult.rows.forEach(upload => {
      console.log(`\\n📄 ${upload.original_name}:`);
      console.log(`   - Uploaded by: ${upload.first_name} ${upload.last_name}`);
      console.log(`   - Date: ${upload.upload_date}`);
      console.log(`   - Records Processed: ${upload.records_processed}`);
      console.log(`   - Errors: ${upload.errors_count}`);
      console.log(`   - Status: ${upload.status}`);
    });
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await pool.end();
  }
}

testDuplicatePrevention().catch(console.error);
