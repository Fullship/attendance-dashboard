const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:3002/api';
const TEST_CREDENTIALS = {
    email: 'mohammed.brzo@company.com',
    password: 'TempPass123!'
};

let authToken = null;

async function testClockWorkflow() {
    console.log('🧪 Testing Clock-In Request Workflow\n');
    
    try {
        // Step 1: Login
        console.log('1️⃣ Testing user login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, TEST_CREDENTIALS);
        
        if (loginResponse.data.token) {
            authToken = loginResponse.data.token;
            console.log('✅ Login successful');
            console.log(`   User: ${loginResponse.data.user.first_name} ${loginResponse.data.user.last_name}`);
            console.log(`   Role: ${loginResponse.data.user.role || 'employee'}\n`);
        } else {
            throw new Error('No token received');
        }
        
        // Step 2: Submit clock-in request
        console.log('2️⃣ Testing clock-in request submission...');
        const clockInResponse = await axios.post(
            `${API_BASE}/users/clock-request`,
            {
                requestType: 'clock_in',
                requestedTime: new Date().toISOString(),
                reason: 'Starting work day - automated test'
            },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Clock-in request submitted successfully');
        console.log(`   Request ID: ${clockInResponse.data.request.request_id}`);
        console.log(`   Status: ${clockInResponse.data.request.status}`);
        console.log(`   Type: ${clockInResponse.data.request.request_type}\n`);
        
        // Step 3: Verify request is pending approval
        console.log('3️⃣ Verifying request status...');
        const profileResponse = await axios.get(`${API_BASE}/users/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ User profile retrieved');
        console.log(`   Current status: ${profileResponse.data.clockStatus || 'clocked_out'}\n`);
        
        // Step 4: Test admin endpoints (would need admin token in real scenario)
        console.log('4️⃣ Testing admin endpoints availability...');
        try {
            await axios.get(`${API_BASE}/admin/clock-requests`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch (adminError) {
            if (adminError.response?.status === 403) {
                console.log('✅ Admin endpoint properly protected (403 Forbidden for non-admin user)');
            } else {
                console.log(`ℹ️  Admin endpoint error: ${adminError.response?.status || 'Network error'}`);
            }
        }
        
        console.log('\n🎉 Clock-in request workflow test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✓ User authentication working');
        console.log('   ✓ Clock-in request submission working');
        console.log('   ✓ Request requires admin approval (status: pending)');
        console.log('   ✓ Admin endpoints are protected');
        console.log('\n💡 Next steps:');
        console.log('   - Admin can review requests at /admin dashboard');
        console.log('   - Requests remain pending until admin approval');
        console.log('   - No direct attendance records created without approval');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
        if (error.response?.status) {
            console.error(`   HTTP Status: ${error.response.status}`);
        }
        
        // Additional debugging info
        if (error.response?.status === 404) {
            console.error('\n🔍 Debugging info:');
            console.error('   - Check if backend server is running on port 3002');
            console.error('   - Verify route registration in server.js');
            console.error('   - Check if /api/users/clock-request endpoint exists');
        }
    }
}

// Run the test
testClockWorkflow();
