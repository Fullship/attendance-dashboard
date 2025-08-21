const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testFrontendUploadFlow() {
  const apiUrl = 'http://localhost:3001/api';
  
  console.log('=== Testing Frontend Upload Flow ===\n');
  
  // Step 1: Login
  console.log('1. Logging in...');
  const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
    email: 'admin@company.com',
    password: 'admin123'
  });
  
  const token = loginResponse.data.token;
  console.log('✅ Login successful\n');
  
  // Step 2: Find Excel file
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.xlsx'));
  
  if (files.length === 0) {
    console.error('❌ No Excel files found');
    return;
  }
  
  const filePath = path.join(uploadsDir, files[0]);
  console.log(`2. Using file: ${files[0]}\n`);
  
  // Step 3: Upload file (simulating frontend adminAPI.uploadAttendanceFile)
  console.log('3. Uploading file...');
  const formData = new FormData();
  formData.append('attendanceFile', fs.createReadStream(filePath), files[0]);
  
  const uploadResponse = await axios.post(`${apiUrl}/admin/upload-attendance`, formData, {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = uploadResponse.data;
  console.log('✅ Upload completed\n');
  
  // Step 4: Simulate frontend processing (like in AdminDashboard.tsx)
  console.log('4. Processing upload result (frontend logic)...');
  
  // Simulate the frontend success message logic
  let successMessage = `Upload completed! Processed ${result.processedCount} records`;
  
  if (result.summary) {
    const { newRecords, duplicateRecords, errorRecords, createdUsers } = result.summary;
    successMessage = `Upload completed! ${newRecords} new records`;
    
    if (duplicateRecords > 0) {
      successMessage += `, ${duplicateRecords} duplicates updated`;
    }
    
    if (createdUsers > 0) {
      successMessage += `, ${createdUsers} users created`;
    }
  }
  
  console.log('📢 SUCCESS TOAST:', successMessage);
  
  // Simulate duplicate records notification
  if (result.duplicatesCount && result.duplicatesCount > 0) {
    const duplicateMessage = `🔄 ${result.duplicatesCount} duplicate records were updated with new data`;
    console.log('ℹ️  INFO TOAST:', duplicateMessage);
  }
  
  // Simulate error notification
  if (result.errorCount > 0) {
    const actualErrors = result.errorCount - (result.duplicatesCount || 0);
    if (actualErrors > 0) {
      const errorMessage = `❌ ${actualErrors} errors occurred during processing`;
      console.log('🚨 ERROR TOAST:', errorMessage);
    }
  }
  
  console.log('\n=== Raw Backend Response ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== Summary ===');
  console.log(`Total records processed: ${result.processedCount}`);
  console.log(`New records: ${result.summary?.newRecords || 0}`);
  console.log(`Duplicate records: ${result.summary?.duplicateRecords || 0}`);
  console.log(`Errors: ${result.summary?.errorRecords || 0}`);
  console.log(`Users created: ${result.summary?.createdUsers || 0}`);
  
  if (result.summary?.duplicateRecords > 0) {
    console.log('\n✅ DUPLICATE DETECTION WORKING! Frontend will show duplicate notifications.');
  } else {
    console.log('\n❌ No duplicates detected.');
  }
}

testFrontendUploadFlow().catch(error => {
  console.error('Error:', error.response?.data || error.message);
});
