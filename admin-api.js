const axios = require('axios');

// Quick API test helper for admin approval functionality
const API_BASE = 'http://localhost:3002/api';

// Get admin token (you need to run this first)
async function getAdminToken() {
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@company.com',
            password: 'AdminPass123!'
        });
        return response.data.token;
    } catch (error) {
        console.error('Admin login failed:', error.response?.data?.message);
        return null;
    }
}

// Test functions
async function listPendingRequests() {
    const token = await getAdminToken();
    if (!token) return;
    
    try {
        const response = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📋 PENDING REQUESTS:');
        response.data.requests.forEach(req => {
            console.log(`   ID: ${req.id} | ${req.userName} | ${req.requestType} | "${req.reason}"`);
        });
        
        return response.data.requests;
    } catch (error) {
        console.error('Failed to get pending requests:', error.response?.data?.message);
    }
}

async function approveRequest(requestId, notes = 'Approved') {
    const token = await getAdminToken();
    if (!token) return;
    
    try {
        const response = await axios.put(
            `${API_BASE}/admin/clock-requests/${requestId}`,
            {
                action: 'approve',
                adminNotes: notes
            },
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        
        console.log(`✅ Request ${requestId} APPROVED`);
        console.log(`   Notes: "${notes}"`);
        return response.data;
    } catch (error) {
        console.error(`Failed to approve request ${requestId}:`, error.response?.data?.message);
    }
}

async function rejectRequest(requestId, notes = 'Rejected') {
    const token = await getAdminToken();
    if (!token) return;
    
    try {
        const response = await axios.put(
            `${API_BASE}/admin/clock-requests/${requestId}`,
            {
                action: 'reject',
                adminNotes: notes
            },
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        
        console.log(`❌ Request ${requestId} REJECTED`);
        console.log(`   Notes: "${notes}"`);
        return response.data;
    } catch (error) {
        console.error(`Failed to reject request ${requestId}:`, error.response?.data?.message);
    }
}

async function listProcessedRequests() {
    const token = await getAdminToken();
    if (!token) return;
    
    try {
        const [approved, rejected] = await Promise.all([
            axios.get(`${API_BASE}/admin/clock-requests?status=approved`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            axios.get(`${API_BASE}/admin/clock-requests?status=rejected`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        console.log('\n✅ APPROVED REQUESTS:');
        approved.data.requests.forEach(req => {
            console.log(`   ID: ${req.id} | ${req.userName} | ${req.requestType} | "${req.adminNotes}"`);
        });
        
        console.log('\n❌ REJECTED REQUESTS:');
        rejected.data.requests.forEach(req => {
            console.log(`   ID: ${req.id} | ${req.userName} | ${req.requestType} | "${req.adminNotes}"`);
        });
        
    } catch (error) {
        console.error('Failed to get processed requests:', error.response?.data?.message);
    }
}

// Command line interface
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function main() {
    switch (command) {
        case 'pending':
            await listPendingRequests();
            break;
        case 'approve':
            if (!arg1) {
                console.log('Usage: node admin-api.js approve <request-id> [notes]');
                break;
            }
            await approveRequest(arg1, arg2 || 'Approved by admin');
            break;
        case 'reject':
            if (!arg1) {
                console.log('Usage: node admin-api.js reject <request-id> [notes]');
                break;
            }
            await rejectRequest(arg1, arg2 || 'Rejected by admin');
            break;
        case 'processed':
            await listProcessedRequests();
            break;
        default:
            console.log(`
🔧 ADMIN API HELPER

Usage:
  node admin-api.js pending                           # List pending requests
  node admin-api.js approve <id> [notes]              # Approve a request
  node admin-api.js reject <id> [notes]               # Reject a request
  node admin-api.js processed                         # List all processed requests

Examples:
  node admin-api.js pending
  node admin-api.js approve 5 "Good reason provided"
  node admin-api.js reject 6 "Need supervisor approval first"
  node admin-api.js processed
            `);
            break;
    }
}

main();
