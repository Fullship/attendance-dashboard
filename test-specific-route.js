const axios = require('axios');

async function testSpecificRoute() {
  try {
    // First login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'test.employee@example.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test clock request route
    console.log('📡 Testing clock request route...');
    const clockResponse = await axios.post('http://localhost:3002/api/users/clock-request', {
      requestType: 'clock_in',
      requestedTime: new Date().toISOString(),
      reason: 'Test clock-in'
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Clock request successful:', clockResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
  }
}

testSpecificRoute();
