const axios = require('axios');
const pool = require('./config/database');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully:', result.rows[0].current_time);
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Users table exists');
      
      // Check if there are any users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log(`📊 Total users in database: ${userCount.rows[0].count}`);
      
      // Show first few users (without passwords)
      const users = await pool.query('SELECT id, email, first_name, last_name, is_admin FROM users LIMIT 5');
      console.log('👥 Sample users:', users.rows);
      
    } else {
      console.log('❌ Users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

async function testLoginEndpoint() {
  try {
    console.log('\n🔐 Testing login endpoint...');
    
    // Test with invalid credentials first
    const response = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    console.log('Login response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log(`📡 Login endpoint responded with status: ${error.response.status}`);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('❌ No response from server:', error.message);
    } else {
      console.log('❌ Request error:', error.message);
    }
  }
}

async function testHealthEndpoint() {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const response = await axios.get('http://localhost:3002/api/health');
    console.log('✅ Health endpoint working:', response.data);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting authentication tests...\n');
  
  await testDatabaseConnection();
  await testHealthEndpoint();
  await testLoginEndpoint();
  
  process.exit(0);
}

runTests();
