const axios = require('axios');

async function testAdminLogin() {
    try {
        console.log('🧪 Testing Admin Login...\n');
        
        const response = await axios.post('http://localhost:3002/api/auth/login', {
            email: 'admin@company.com',
            password: 'AdminPass123!'
        });
        
        if (response.data.token) {
            console.log('✅ Admin login successful!');
            console.log(`   Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
            console.log(`   Email: ${response.data.user.email}`);
            console.log(`   Admin: ${response.data.user.isAdmin ? 'Yes' : 'No'}`);
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            
            // Test admin endpoints
            console.log('\n🔐 Testing admin endpoint access...');
            const adminResponse = await axios.get('http://localhost:3002/api/admin/clock-requests', {
                headers: { 'Authorization': `Bearer ${response.data.token}` }
            });
            
            console.log('✅ Admin endpoint accessible!');
            console.log(`   Pending requests: ${adminResponse.data.requests ? adminResponse.data.requests.length : adminResponse.data.length || 0}`);
            
        } else {
            console.log('❌ Login failed - no token received');
        }
        
    } catch (error) {
        console.error('❌ Admin login test failed:', error.response?.data?.message || error.message);
    }
}

testAdminLogin();
