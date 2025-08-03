const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'attendance_db',
  password: 'password123',
  port: 5433,
});

async function testDirectQuery() {
  try {
    console.log('Testing direct database query...');

    // Test the exact count query we're using in the API
    const countQuery = `
      SELECT COUNT(*) 
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE lr.status = $1
    `;

    const result = await pool.query(countQuery, ['pending']);
    console.log('Count query result:', result.rows[0]);
    console.log('Total pending leave requests:', parseInt(result.rows[0].count));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testDirectQuery();
