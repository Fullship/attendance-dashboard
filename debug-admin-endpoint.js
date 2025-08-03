const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function testAdminEndpoint() {
  try {
    // First login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test.admin@example.com',
      password: 'test123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Now test the admin clock-requests endpoint
    console.log('📋 Fetching pending clock requests...');
    const response = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Response received:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAdminEndpoint();
