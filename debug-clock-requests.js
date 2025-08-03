const axios = require('axios');

async function testClockRequestStructure() {
    try {
        // First, let's see what the API returns for clock requests
        const response = await axios.get('http://localhost:3002/api/admin/clock-requests?status=pending', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM2MjU2NzE5LCJleHAiOjE3MzYyNjAzMTl9.sYlp9YzXkLMzQUxhj7gLuJN4JU9NQRLcEKxHcxQT7DY'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.requests) {
            console.log('\nFirst request structure:');
            console.log('Keys:', Object.keys(response.data.requests[0] || {}));
            console.log('ID field:', response.data.requests[0]?.id);
            console.log('Request_id field:', response.data.requests[0]?.request_id);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testClockRequestStructure();
