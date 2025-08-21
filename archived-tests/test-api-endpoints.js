const axios = require('axios');

// Test the leave requests API endpoint directly
async function testLeaveRequestsAPI() {
  try {
    console.log('Testing leave requests API...');

    // First, let's try to get an admin token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'admin@company.com',
      password: 'admin123',
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Test the leave requests endpoint
    console.log('2. Testing leave requests endpoint...');
    const leaveResponse = await axios.get(
      'http://localhost:3002/api/admin-leave/admin/leave-requests',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          page: 1,
          limit: 1,
          status: 'pending',
        },
      }
    );

    console.log('✅ Leave requests API response:');
    console.log('Status:', leaveResponse.status);
    console.log('Data structure:');
    console.log('- leaveRequests count:', leaveResponse.data.leaveRequests?.length || 0);
    console.log('- pagination:', leaveResponse.data.pagination);
    console.log('- statistics:', leaveResponse.data.statistics);

    if (leaveResponse.data.pagination?.total !== undefined) {
      console.log(`✅ Pending leave requests count: ${leaveResponse.data.pagination.total}`);
    } else {
      console.log('❌ No pagination.total found in response');
    }

    // Test clock requests endpoint for comparison
    console.log('3. Testing clock requests endpoint for comparison...');
    const clockResponse = await axios.get('http://localhost:3002/api/admin/clock-requests', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page: 1,
        limit: 1,
        status: 'pending',
      },
    });

    console.log('✅ Clock requests API response:');
    console.log('Status:', clockResponse.status);
    console.log('- requests count:', clockResponse.data.requests?.length || 0);
    console.log('- pagination:', clockResponse.data.pagination);

    if (clockResponse.data.pagination?.total !== undefined) {
      console.log(`✅ Pending clock requests count: ${clockResponse.data.pagination.total}`);
    } else {
      console.log('❌ No pagination.total found in response');
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testLeaveRequestsAPI();
