const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_dashboard',
  user: 'salarjirjees',
  password: '',
});

async function updateAdminPassword() {
    try {
        // Hash the password
        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update admin user password
        const query = `
            UPDATE users 
            SET password_hash = $1 
            WHERE email = 'admin@company.com'
            RETURNING id, email, first_name, last_name, is_admin;
        `;
        
        const result = await pool.query(query, [hashedPassword]);
        
        if (result.rows.length > 0) {
            console.log('✅ Admin password updated successfully:');
            console.log(result.rows[0]);
            console.log('📧 Email: admin@company.com');
            console.log('🔑 Password: admin123');
        } else {
            console.log('❌ No admin user found with email: admin@company.com');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error updating admin password:', error);
        await pool.end();
    }
}

updateAdminPassword();
