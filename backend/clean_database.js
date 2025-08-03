require('dotenv').config();
const pool = require('./config/database');

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database...');
    
    // Delete all attendance records
    const attendanceResult = await pool.query('DELETE FROM attendance_records');
    console.log(`✅ Deleted ${attendanceResult.rowCount} attendance records`);
    
    // Delete all file uploads
    const uploadsResult = await pool.query('DELETE FROM file_uploads');
    console.log(`✅ Deleted ${uploadsResult.rowCount} file upload records`);
    
    // Delete all non-admin users (keep admin users)
    const usersResult = await pool.query('DELETE FROM users WHERE is_admin = FALSE');
    console.log(`✅ Deleted ${usersResult.rowCount} non-admin users`);
    
    // Reset auto-increment sequences to continue from current max IDs
    const maxUserId = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM users');
    await pool.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${maxUserId.rows[0].next_id}`);
    await pool.query('ALTER SEQUENCE attendance_records_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE file_uploads_id_seq RESTART WITH 1');
    console.log(`✅ Reset ID sequences (users will start from ID ${maxUserId.rows[0].next_id})`);
    
    // Create fresh test users
    console.log('👥 Creating fresh test users...');
    
    const bcrypt = require('bcryptjs');
    const tempPassword = 'TempPass123!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const testUsers = [
      { email: 'john.doe@company.com', firstName: 'John', lastName: 'Doe' },
      { email: 'jane.smith@company.com', firstName: 'Jane', lastName: 'Smith' },
      { email: 'mike.johnson@company.com', firstName: 'Mike', lastName: 'Johnson' }
    ];
    
    for (const user of testUsers) {
      const result = await pool.query(
        'INSERT INTO users (email, first_name, last_name, password, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [user.email, user.firstName, user.lastName, passwordHash, false]
      );
      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (ID: ${result.rows[0].id})`);
    }
    
    // Show current database state
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const adminCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = TRUE');
    const employeeCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = FALSE');
    
    console.log('📊 Database state after cleanup:');
    console.log(`   Total users: ${userCount.rows[0].count}`);
    console.log(`   Admin users: ${adminCount.rows[0].count}`);
    console.log(`   Employee users: ${employeeCount.rows[0].count}`);
    console.log(`   Attendance records: 0`);
    console.log(`   File uploads: 0`);
    
    console.log('✅ Database cleaned successfully!');
    console.log('🔑 All users have password: TempPass123!');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
  } finally {
    await pool.end();
  }
}

cleanDatabase();
