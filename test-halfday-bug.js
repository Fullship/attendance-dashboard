const axios = require('axios');

async function testLeaveRequest() {
  try {
    // Create form data to simulate the frontend request
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Simulate a FULL DAY leave request
    formData.append('leaveType', 'vacation');
    formData.append('startDate', '2025-07-15');
    formData.append('endDate', '2025-07-17');
    formData.append('halfDay', 'false');  // This is the key - it's a string "false"
    formData.append('reason', 'Test full day leave');

    console.log('Sending request with halfDay as string "false"');
    
    const response = await axios.post('http://localhost:3002/enhanced-leave/leave-request', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token'  // You may need a valid token
      }
    });

    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

testLeaveRequest();
