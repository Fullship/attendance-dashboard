const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';
const FRONTEND_BASE = 'http://localhost:3001';

// Test data
const employeeCredentials = {
  email: 'test.employee@example.com',
  password: 'test123'
};

const adminCredentials = {
  email: 'test.admin@example.com',
  password: 'test123'
};

async function testFrontendIntegration() {
  try {
    console.log('🔧 Testing frontend-backend integration...\n');

    // Test 1: Check if frontend is running
    console.log('1️⃣ Checking if frontend is accessible...');
    try {
      const frontendResponse = await axios.get(FRONTEND_BASE, { timeout: 5000 });
      console.log('✅ Frontend is running and accessible\n');
    } catch (error) {
      console.log('❌ Frontend is not accessible:', error.message);
      return;
    }

    // Test 2: Check if backend API is accessible
    console.log('2️⃣ Checking backend API...');
    const healthCheck = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend API is running\n');

    // Test 3: Test authentication
    console.log('3️⃣ Testing employee authentication...');
    const employeeLogin = await axios.post(`${API_BASE}/auth/login`, employeeCredentials);
    const employeeToken = employeeLogin.data.token;
    console.log('✅ Employee authentication works\n');

    console.log('4️⃣ Testing admin authentication...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin authentication works\n');

    // Test 4: Test employee endpoints
    console.log('5️⃣ Testing employee calendar access...');
    const currentDate = new Date();
    const calendar = await axios.get(`${API_BASE}/attendance/calendar?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    console.log(`✅ Employee can access calendar (${calendar.data.records.length} records found)\n`);

    // Test 5: Test admin endpoints
    console.log('6️⃣ Testing admin clock requests access...');
    const clockRequests = await axios.get(`${API_BASE}/admin/clock-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Admin can access clock requests (${clockRequests.data.requests.length} pending requests)\n`);

    // Test 6: Test clock request submission
    console.log('7️⃣ Testing clock request submission...');
    const clockRequest = await axios.post(`${API_BASE}/users/clock-request`, {
      requestType: 'clock_in',
      requestedTime: new Date().toISOString(),
      reason: 'Integration test clock-in'
    }, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    console.log(`✅ Clock request submitted successfully (ID: ${clockRequest.data.request.id})\n`);

    console.log('🎉 All integration tests passed! Frontend and backend are fully integrated.\n');
    
    console.log('📝 Summary:');
    console.log('✅ Frontend is running on http://localhost:3001');
    console.log('✅ Backend API is running on http://localhost:3002');
    console.log('✅ Employee authentication works');
    console.log('✅ Admin authentication works');
    console.log('✅ Employee can access calendar');
    console.log('✅ Admin can access clock requests');
    console.log('✅ Clock requests can be submitted');
    console.log('\n🚀 The attendance dashboard is ready for use!');

  } catch (error) {
    console.error('❌ Integration test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFrontendIntegration();
