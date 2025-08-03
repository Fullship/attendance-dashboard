const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function setupTestUsers() {
  try {
    console.log('🔧 Setting up test users...\n');

    // Create employee user
    console.log('1️⃣ Creating employee user...');
    try {
      const employeeResponse = await axios.post(`${API_BASE}/auth/register`, {
        email: 'test@example.com',
        password: 'test123',
        firstName: 'Test',
        lastName: 'Employee'
      });
      console.log('✅ Employee user created successfully');
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ Employee user already exists');
      } else {
        throw error;
      }
    }

    // Check if admin exists by trying to login
    console.log('\n2️⃣ Testing admin login...');
    try {
      const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@example.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful');
    } catch (error) {
      console.log('⚠️ Admin login failed, checking other credentials...');
      
      // Try different admin credentials
      const adminCredentials = [
        { email: 'admin@example.com', password: 'password123' },
        { email: 'admin@test.com', password: 'admin123' },
        { email: 'admin@test.com', password: 'password123' }
      ];
      
      for (const creds of adminCredentials) {
        try {
          const login = await axios.post(`${API_BASE}/auth/login`, creds);
          console.log(`✅ Admin login successful with ${creds.email} / ${creds.password}`);
          break;
        } catch (err) {
          console.log(`❌ Failed: ${creds.email} / ${creds.password}`);
        }
      }
    }

    console.log('\n🎉 Test user setup completed!');

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
  }
}

setupTestUsers();
