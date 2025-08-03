const { pool } = require('./backend/config/database');

async function checkClockRequests() {
    try {
        // First, check if there are any clock requests
        const result = await pool.query('SELECT * FROM clock_requests ORDER BY created_at DESC LIMIT 5');
        console.log('Number of clock requests:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('\nFirst few clock requests:');
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}. ID: ${row.request_id}, User ID: ${row.user_id}, Type: ${row.request_type}, Status: ${row.status}`);
            });
        } else {
            console.log('No clock requests found in the database');
        }
        
        // Also check if there are any users
        const userResult = await pool.query('SELECT id, email, is_admin FROM users ORDER BY id');
        console.log('\nUsers in database:');
        userResult.rows.forEach((row) => {
            console.log(`ID: ${row.id}, Email: ${row.email}, Admin: ${row.is_admin}`);
        });
        
    } catch (error) {
        console.error('Error checking clock requests:', error);
    } finally {
        process.exit(0);
    }
}

checkClockRequests();
