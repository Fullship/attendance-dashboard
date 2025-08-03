const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

async function testSameDayValidation() {
  console.log('🧪 Testing Same-Day Leave Request Validation\n');
  
  try {
    // Create a test user first
    console.log('0️⃣ Creating test user...');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        email: 'testuser.sameday@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'SameDay'
      });
      console.log('✅ Test user created');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('ℹ️ Test user already exists (continuing...)');
      } else {
        throw error;
      }
    }
    
    // Login as employee
    console.log('1️⃣ Logging in as test user...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'testuser.sameday@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Test user login successful\n');
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Clean up any existing leave requests for today
    console.log('🧹 Cleaning up existing leave requests...');
    try {
      const existingRequests = await axios.get(`${BASE_URL}/api/enhanced-leave/my-leave-requests`, { headers });
      const today = new Date().toISOString().split('T')[0];
      
      for (const request of existingRequests.data.leaveRequests) {
        if (request.startDate === today && request.status === 'pending') {
          try {
            await axios.delete(`${BASE_URL}/api/enhanced-leave/leave-request/${request.id}`, { headers });
            console.log(`   Removed request ${request.id} for ${request.startDate}`);
          } catch (deleteError) {
            console.log(`   Failed to remove request ${request.id}:`, deleteError.response?.data?.message || deleteError.message);
          }
        }
      }
    } catch (cleanupError) {
      console.log('   Cleanup error (continuing...):', cleanupError.message);
    }
    console.log('');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Test 1: Try to submit full-day leave for today (should fail)
    console.log('2️⃣ Testing full-day leave for today (should FAIL)...');
    let createdRequestId = null;
    try {
      const response = await axios.post(`${BASE_URL}/api/enhanced-leave/leave-request`, {
        leaveType: 'vacation',
        startDate: today,
        endDate: today,
        halfDay: false,
        reason: 'Testing same-day full leave'
      }, { headers });
      
      console.log('❌ ERROR: Full-day same-day leave was accepted (should have been rejected)');
      createdRequestId = response.data.leaveRequest.id;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ PASS: Full-day same-day leave rejected as expected');
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Clean up any accidentally created request
    if (createdRequestId) {
      try {
        await axios.delete(`${BASE_URL}/api/enhanced-leave/leave-request/${createdRequestId}`, { headers });
        console.log('🧹 Cleaned up accidentally created request');
      } catch (cleanupError) {
        console.log('⚠️ Failed to clean up request:', cleanupError.message);
      }
    }
    
    console.log('');
    
    // Test 2: Try to submit half-day leave for today (should succeed)
    console.log('3️⃣ Testing half-day leave for today (should PASS)...');
    try {
      const response = await axios.post(`${BASE_URL}/api/enhanced-leave/leave-request`, {
        leaveType: 'vacation',
        startDate: today,
        endDate: today,
        halfDay: true,
        halfDayPeriod: 'morning',
        reason: 'Testing same-day half leave'
      }, { headers });
      
      console.log('✅ PASS: Half-day same-day leave accepted as expected');
      console.log(`   Request ID: ${response.data.leaveRequest.id}`);
      
      // Clean up: Cancel the request
      await axios.delete(`${BASE_URL}/api/enhanced-leave/leave-request/${response.data.leaveRequest.id}`, { headers });
      console.log('🧹 Test request cleaned up');
      
    } catch (error) {
      console.log('❌ ERROR: Half-day same-day leave was rejected (should have been accepted)');
      console.log('   Message:', error.response?.data?.message || error.message);
    }
    
    console.log('');
    
    // Test 3: Try to submit full-day leave for tomorrow (should succeed)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log('4️⃣ Testing full-day leave for tomorrow (should PASS)...');
    try {
      const response = await axios.post(`${BASE_URL}/api/enhanced-leave/leave-request`, {
        leaveType: 'vacation',
        startDate: tomorrowStr,
        endDate: tomorrowStr,
        halfDay: false,
        reason: 'Testing future full leave'
      }, { headers });
      
      console.log('✅ PASS: Future full-day leave accepted as expected');
      console.log(`   Request ID: ${response.data.leaveRequest.id}`);
      
      // Clean up: Cancel the request
      await axios.delete(`${BASE_URL}/api/enhanced-leave/leave-request/${response.data.leaveRequest.id}`, { headers });
      console.log('🧹 Test request cleaned up');
      
    } catch (error) {
      console.log('❌ ERROR: Future full-day leave was rejected (should have been accepted)');
      console.log('   Message:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Same-day validation tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Run the test
testSameDayValidation();
