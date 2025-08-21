const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('Testing frontend API...');

    // 1. Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123',
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // 2. Test leave requests API
    const leaveResponse = await axios.get(
      'http://localhost:5000/api/admin-leave/admin/leave-requests',
      {
        params: {
          page: 1,
          limit: 1,
          status: 'pending',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Leave requests API response:');
    console.log('Status:', leaveResponse.status);
    console.log('Pagination:', leaveResponse.data.pagination);
    console.log('Total pending leave requests:', leaveResponse.data.pagination.total);

    // 3. Test clock requests API
    const clockResponse = await axios.get('http://localhost:5000/api/admin/clock-requests', {
      params: {
        page: 1,
        limit: 1,
        status: 'pending',
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Clock requests API response:');
    console.log('Status:', clockResponse.status);
    console.log('Pagination:', clockResponse.data.pagination);
    console.log('Total pending clock requests:', clockResponse.data.pagination.total);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFrontendAPI();
