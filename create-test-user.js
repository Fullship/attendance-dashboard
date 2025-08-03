const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_dashboard',
  user: 'salarjirjees',
  password: '',
});

async function createTestUser() {
    try {
        // Hash the password
        const password = 'TempPass123!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert test user
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name
            RETURNING id, email, first_name, last_name, is_admin;
        `;
        
        const result = await pool.query(query, [
            'mohammed.brzo@company.com',
            hashedPassword,
            'Mohammed',
            'Brzo',
            false
        ]);
        
        console.log('✅ Test user created/updated successfully:');
        console.log(result.rows[0]);
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error creating test user:', error);
        await pool.end();
    }
}

createTestUser();
