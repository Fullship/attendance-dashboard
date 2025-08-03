const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_dashboard',
  user: 'salarjirjees',
  password: '',
});

async function resetAdminPassword() {
    try {
        // Set new admin password
        const newPassword = 'AdminPass123!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update admin password
        const result = await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, first_name, last_name, is_admin;',
            [hashedPassword, 'admin@company.com']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Admin password reset successfully!');
            console.log('📋 Admin Login Credentials:');
            console.log('   Email: admin@company.com');
            console.log('   Password: AdminPass123!');
            console.log('');
            console.log('👤 Admin User Details:');
            console.log(result.rows[0]);
        } else {
            console.log('❌ Admin user not found');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error resetting admin password:', error);
        await pool.end();
    }
}

// Also create a function to verify the password works
async function testAdminLogin() {
    try {
        const testPassword = 'AdminPass123!';
        
        // Get admin user
        const result = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@company.com']);
        
        if (result.rows.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }
        
        const admin = result.rows[0];
        
        // Test password
        const isMatch = await bcrypt.compare(testPassword, admin.password_hash);
        
        if (isMatch) {
            console.log('✅ Password verification successful!');
            console.log('🔐 Admin can log in with: admin@company.com / AdminPass123!');
        } else {
            console.log('❌ Password verification failed');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error testing admin login:', error);
        await pool.end();
    }
}

// Run the reset
console.log('🔄 Resetting admin password...\n');
resetAdminPassword();
