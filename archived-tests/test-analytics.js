#!/usr/bin/env node

async function testAnalytics() {
  try {
    console.log('🧪 Testing analytics endpoint...');
    
    // Use http module for compatibility
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/admin/careers/analytics',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('📊 Response status:', res.statusCode);
      console.log('📊 Response headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response body:', data);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log('✅ JSON parsed successfully:', jsonData);
          } catch (e) {
            console.log('⚠️ Response is not JSON');
          }
        } else {
          console.log('❌ Request failed with status:', res.statusCode);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('🚨 Error:', error.message);
      console.error('🚨 Full error:', error);
      console.error('🚨 Error code:', error.code);
      console.error('🚨 Error details:', JSON.stringify(error, null, 2));
    });
    
    req.end();
    
  } catch (error) {
    console.error('🚨 Error:', error.message);
  }
}

testAnalytics();
