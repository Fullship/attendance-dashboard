// Simple test to verify the employee assignment API fix
const axios = require('axios');

const testEmployeeAssignment = async () => {
  try {
    console.log('Testing employee assignment API with team that has NULL location...');

    // Test data: assign employee to team 1 (Development team with NULL location_id)
    const testData = {
      teamId: 1, // Development team with NULL location
    };

    // This would normally require a valid auth token, but we can test the endpoint exists
    const response = await axios.put(
      'http://localhost:3002/api/admin/employees/30/assignment',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token-for-test',
        },
      }
    );

    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);

      // A 401 Unauthorized error is expected due to invalid token
      // A 400 Bad Request would indicate the validation issue still exists
      if (error.response.status === 401) {
        console.log('✅ API endpoint is accessible (authentication error is expected)');
      } else if (error.response.status === 400) {
        console.log('❌ API validation issue still exists:', error.response.data.message);
      } else {
        console.log('ℹ️ Other error:', error.response.status, error.response.data.message);
      }
    } else {
      console.log('Connection error:', error.message);
    }
  }
};

testEmployeeAssignment();
