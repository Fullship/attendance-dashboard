#!/usr/bin/env node

const axios = require('axios');

async function testClockRoute() {
  try {
    console.log('Testing clock-request route...');
    
    // Test without auth (should get auth error, not route not found)
    const response = await axios.post('http://localhost:3002/api/users/clock-request', {
      requestType: 'clock_in',
      requestedTime: new Date().toISOString(),
      reason: 'Test request'
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testClockRoute();
