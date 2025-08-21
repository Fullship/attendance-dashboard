const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function createTestScenario() {
    try {
        // 1. Create a test user
        console.log('1. Creating test user...');
        const userResponse = await axios.post(`${API_BASE}/auth/register`, {
            email: 'testuser2@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User2'
        });
        console.log('✅ Test user created:', userResponse.data);
        
        // 2. Login to get token
        console.log('\n2. Logging in user...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'testuser2@example.com',
            password: 'password123'
        });
        const userToken = loginResponse.data.token;
        console.log('✅ User logged in, token:', userToken.substring(0, 20) + '...');
        
        // 3. Submit a clock request
        console.log('\n3. Submitting clock request...');
        const clockRequestResponse = await axios.post(`${API_BASE}/users/clock-request`, {
            requestType: 'clock_in',
            requestedTime: '09:00',
            reason: 'Forgot to clock in this morning'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log('✅ Clock request submitted:', clockRequestResponse.data);
        
        // 4. Now test admin login
        console.log('\n4. Testing admin login...');
        const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'testadmin@example.com',
            password: 'admin123'
        });
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin logged in, token:', adminToken.substring(0, 20) + '...');
        
        // 5. Get pending clock requests
        console.log('\n5. Getting pending clock requests...');
        const pendingRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log('✅ Pending requests:', JSON.stringify(pendingRequests.data, null, 2));
        
        if (pendingRequests.data.requests && pendingRequests.data.requests.length > 0) {
            const firstRequest = pendingRequests.data.requests[0];
            console.log('\n📋 First request details:');
            console.log('  ID:', firstRequest.id);
            console.log('  User ID:', firstRequest.userId);
            console.log('  Type:', firstRequest.requestType);
            console.log('  Status:', firstRequest.status);
            
            // 6. Try to approve the request
            console.log('\n6. Approving the request...');
            const approvalResponse = await axios.put(`${API_BASE}/admin/clock-requests/${firstRequest.id}`, {
                action: 'approve',
                adminNotes: 'Approved by test script'
            }, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            console.log('✅ Request approved:', approvalResponse.data);
        } else {
            console.log('❌ No pending requests found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

createTestScenario();
