const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

// Test data
const employeeCredentials = {
  email: 'test.employee@example.com',
  password: 'test123'
};

const adminCredentials = {
  email: 'test.admin@example.com',
  password: 'test123'
};

let employeeToken = '';
let adminToken = '';
let employeeId = '';
let clockRequestId = '';

async function testFullWorkflow() {
  try {
    console.log('🧪 Testing full clock request workflow...\n');

    // Step 1: Login as employee
    console.log('1️⃣ Logging in as employee...');
    const employeeLogin = await axios.post(`${API_BASE}/auth/login`, employeeCredentials);
    employeeToken = employeeLogin.data.token;
    employeeId = employeeLogin.data.user.id;
    console.log(`✅ Employee logged in successfully (ID: ${employeeId})\n`);

    // Step 2: Submit clock-in request
    console.log('2️⃣ Submitting clock-in request...');
    const clockInRequest = await axios.post(`${API_BASE}/users/clock-request`, {
      requestType: 'clock_in',
      requestedTime: new Date().toISOString(),
      reason: 'Normal clock-in'
    }, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    clockRequestId = clockInRequest.data.request.id;
    console.log(`✅ Clock-in request submitted (ID: ${clockRequestId})\n`);

    // Step 3: Login as admin
    console.log('3️⃣ Logging in as admin...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
    adminToken = adminLogin.data.token;
    console.log(`✅ Admin logged in successfully\n`);

    // Step 4: Get pending clock requests
    console.log('4️⃣ Fetching pending clock requests...');
    const pendingRequests = await axios.get(`${API_BASE}/admin/clock-requests?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Found ${pendingRequests.data.requests.length} pending requests\n`);

    // Step 5: Approve the clock-in request
    console.log('5️⃣ Approving clock-in request...');
    const approval = await axios.put(`${API_BASE}/admin/clock-requests/${clockRequestId}`, {
      action: 'approve',
      adminNotes: 'Approved for testing'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Clock-in request approved: ${approval.data.message}\n`);

    // Step 6: Check employee calendar for the attendance record
    console.log('6️⃣ Checking employee calendar for attendance record...');
    const currentDate = new Date();
    const calendar = await axios.get(`${API_BASE}/attendance/calendar?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    const today = currentDate.toISOString().split('T')[0];
    const todayRecord = calendar.data.records.find(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === today;
    });
    
    if (todayRecord) {
      console.log(`✅ Attendance record found for today:`);
      console.log(`   Date: ${todayRecord.date}`);
      console.log(`   Clock In: ${todayRecord.clock_in}`);
      console.log(`   Status: ${todayRecord.status}`);
      console.log(`   Notes: ${todayRecord.notes}`);
    } else {
      console.log(`❌ No attendance record found for today (${today})`);
      console.log('Available records:');
      calendar.data.records.forEach(record => {
        console.log(`   ${record.date}: ${record.status} (In: ${record.clock_in}, Out: ${record.clock_out})`);
      });
    }
    console.log();

    // Step 7: Submit clock-out request
    console.log('7️⃣ Submitting clock-out request...');
    const clockOutTime = new Date();
    clockOutTime.setHours(clockOutTime.getHours() + 8); // Simulate 8 hours later
    const clockOutRequest = await axios.post(`${API_BASE}/users/clock-request`, {
      requestType: 'clock_out',
      requestedTime: clockOutTime.toISOString(),
      reason: 'End of work day'
    }, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const clockOutRequestId = clockOutRequest.data.request.id;
    console.log(`✅ Clock-out request submitted (ID: ${clockOutRequestId})\n`);

    // Step 8: Approve clock-out request
    console.log('8️⃣ Approving clock-out request...');
    const clockOutApproval = await axios.put(`${API_BASE}/admin/clock-requests/${clockOutRequestId}`, {
      action: 'approve',
      adminNotes: 'End of day approved'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Clock-out request approved: ${clockOutApproval.data.message}\n`);

    // Step 9: Check updated calendar
    console.log('9️⃣ Checking updated calendar...');
    const updatedCalendar = await axios.get(`${API_BASE}/attendance/calendar?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    const updatedTodayRecord = updatedCalendar.data.records.find(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === today;
    });
    
    if (updatedTodayRecord) {
      console.log(`✅ Updated attendance record for today:`);
      console.log(`   Date: ${updatedTodayRecord.date}`);
      console.log(`   Clock In: ${updatedTodayRecord.clock_in}`);
      console.log(`   Clock Out: ${updatedTodayRecord.clock_out}`);
      console.log(`   Hours Worked: ${updatedTodayRecord.hours_worked}`);
      console.log(`   Status: ${updatedTodayRecord.status}`);
      console.log(`   Notes: ${updatedTodayRecord.notes}`);
    } else {
      console.log(`❌ Still no attendance record found for today (${today})`);
    }

    console.log('\n🎉 Full workflow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFullWorkflow();
