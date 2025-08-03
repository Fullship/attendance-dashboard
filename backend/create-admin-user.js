const bcrypt = require('bcryptjs');
require('dotenv').config();
const pool = require('./config/database');

async function createTestAdmin() {
    try {
        const email = 'testadmin@example.com';
        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Check if admin already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log('❌ Admin user already exists');
            return;
        }
        
        // Insert admin user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, hashedPassword, 'Test', 'Admin', true]
        );
        
        console.log('✅ Admin user created successfully:');
        console.log('   Email:', email);
        console.log('   Password:', password);
        console.log('   ID:', result.rows[0].id);
        console.log('   Is Admin:', result.rows[0].is_admin);
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        process.exit(0);
    }
}

createTestAdmin();
