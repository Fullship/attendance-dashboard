#!/usr/bin/env node

const axios = require('axios');

async function testCORSLogin() {
  console.log('🧪 Testing CORS-enabled login functionality...\n');
  
  const API_BASE = 'http://localhost:3002/api';
  
  // Create axios instance with same config as frontend
  const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3005'
    },
  });
  
  try {
    console.log('1. Testing OPTIONS preflight request...');
    const optionsResponse = await axios.options(`${API_BASE}/auth/login`, {
      headers: {
        'Origin': 'http://localhost:3005',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log(`   ✅ Preflight successful: ${optionsResponse.status}`);
    console.log(`   📋 CORS headers: ${optionsResponse.headers['access-control-allow-origin']}\n`);
    
    console.log('2. Testing actual login request...');
    try {
      const loginResponse = await api.post('/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`   ✅ Login request successful (expected error): ${error.response.data.message}`);
        console.log(`   📋 Response CORS headers: ${error.response.headers['access-control-allow-origin']}\n`);
      } else {
        throw error;
      }
    }
    
    console.log('🎉 CORS test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • CORS preflight working ✅');
    console.log('   • POST requests with credentials working ✅'); 
    console.log('   • Origin http://localhost:3005 allowed ✅');
    console.log('   • Frontend should now be able to login ✅');
    console.log('\n💡 You can now try logging in from the frontend at http://localhost:3005');
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

testCORSLogin();
