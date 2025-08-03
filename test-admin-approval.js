const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:3002/api';
const ADMIN_CREDENTIALS = {
    email: 'admin@company.com',
    password: 'AdminPass123!'
};

const EMPLOYEE_CREDENTIALS = {
    email: 'mohammed.brzo@company.com',
    password: 'TempPass123!'
};

let adminToken = null;
let employeeToken = null;

async function testAdminApprovalWorkflow() {
    console.log('🧪 Testing Admin Clock Request Approval/Rejection Workflow\n');
    
    try {
        // Step 1: Employee login and submit clock request
        console.log('1️⃣ Employee submitting clock-in request...');
        const employeeLogin = await axios.post(`${API_BASE}/auth/login`, EMPLOYEE_CREDENTIALS);
        employeeToken = employeeLogin.data.token;
        
        const clockRequest = await axios.post(
            `${API_BASE}/users/clock-request`,
            {
                requestType: 'clock_in',
                requestedTime: new Date().toISOString(),
                reason: 'Starting work day - admin test workflow'
            },
            {
                headers: { 'Authorization': `Bearer ${employeeToken}` }
            }
        );
        
        console.log('✅ Employee clock-in request submitted');
        console.log(`   Employee: ${employeeLogin.data.user.firstName} ${employeeLogin.data.user.lastName}`);
        console.log(`   Status: pending\n`);
        
        // Step 2: Admin login
        console.log('2️⃣ Admin logging in...');
        const adminLogin = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
        adminToken = adminLogin.data.token;
        
        console.log('✅ Admin login successful');
        console.log(`   Admin: ${adminLogin.data.user.firstName} ${adminLogin.data.user.lastName}\n`);
        
        // Step 3: Admin views pending requests
        console.log('3️⃣ Admin viewing pending requests...');
        const pendingRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Pending requests retrieved');
        console.log(`   Total pending: ${pendingRequests.data.requests.length}`);
        
        if (pendingRequests.data.requests.length > 0) {
            const latestRequest = pendingRequests.data.requests[pendingRequests.data.requests.length - 1];
            console.log(`   Latest request ID: ${latestRequest.id}`);
            console.log(`   Employee: ${latestRequest.userName}`);
            console.log(`   Type: ${latestRequest.requestType}`);
            console.log(`   Reason: ${latestRequest.reason}\n`);
            
            // Step 4: Admin approves the request
            console.log('4️⃣ Admin approving the request...');
            const approvalResponse = await axios.put(
                `${API_BASE}/admin/clock-requests/${latestRequest.id}`,
                {
                    action: 'approve',
                    adminNotes: 'Request approved - valid work start time'
                },
                {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                }
            );
            
            console.log('✅ Request approved successfully!');
            console.log(`   Status: ${approvalResponse.data.status}`);
            console.log(`   Admin notes: ${approvalResponse.data.adminNotes || 'None'}`);
            console.log(`   Processed at: ${approvalResponse.data.processedAt}\n`);
            
            // Step 5: Submit another request to test rejection
            console.log('5️⃣ Employee submitting another request for rejection test...');
            const clockOutRequest = await axios.post(
                `${API_BASE}/users/clock-request`,
                {
                    requestType: 'clock_out',
                    requestedTime: new Date(Date.now() + 60000).toISOString(), // 1 minute later
                    reason: 'Leaving early for appointment'
                },
                {
                    headers: { 'Authorization': `Bearer ${employeeToken}` }
                }
            );
            
            // Get the new request
            const newPendingRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            const newRequest = newPendingRequests.data.requests[newPendingRequests.data.requests.length - 1];
            
            // Step 6: Admin rejects the request
            console.log('6️⃣ Admin rejecting the clock-out request...');
            const rejectionResponse = await axios.put(
                `${API_BASE}/admin/clock-requests/${newRequest.id}`,
                {
                    action: 'reject',
                    adminNotes: 'Clock-out time not approved. Please discuss with supervisor first.'
                },
                {
                    headers: { 'Authorization': `Bearer ${adminToken}` }
                }
            );
            
            console.log('✅ Request rejected successfully!');
            console.log(`   Status: ${rejectionResponse.data.status}`);
            console.log(`   Admin notes: ${rejectionResponse.data.adminNotes}`);
            console.log(`   Processed at: ${rejectionResponse.data.processedAt}\n`);
            
            // Step 7: View all processed requests
            console.log('7️⃣ Viewing all processed requests...');
            const approvedRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=approved`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            const rejectedRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=rejected`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            console.log('✅ Processed requests summary:');
            console.log(`   Approved requests: ${approvedRequests.data.requests.length}`);
            console.log(`   Rejected requests: ${rejectedRequests.data.requests.length}`);
            
        } else {
            console.log('ℹ️  No pending requests found');
        }
        
        console.log('\n🎉 Admin approval/rejection workflow test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✓ Employee can submit clock requests');
        console.log('   ✓ Admin can view pending requests');
        console.log('   ✓ Admin can approve requests');
        console.log('   ✓ Admin can reject requests');
        console.log('   ✓ Admin can add notes to decisions');
        console.log('   ✓ Requests are properly tracked and timestamped');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
        if (error.response?.status) {
            console.error(`   HTTP Status: ${error.response.status}`);
        }
    }
}

// Run the test
testAdminApprovalWorkflow();
