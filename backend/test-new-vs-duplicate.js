const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Create a simple test Excel file with new data
function createTestExcelFile() {
  const testData = [
    {
      'Employee Name': 'Test User New',
      'Email': 'testuser.new@company.com',
      'Date': '2024-01-15',
      'Clock In': '09:00:00',
      'Clock Out': '17:00:00',
      'Status': 'present'
    },
    {
      'Employee Name': 'Another Test User',
      'Email': 'another.test@company.com', 
      'Date': '2024-01-15',
      'Clock In': '09:30:00',
      'Clock Out': '17:30:00',
      'Status': 'late'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  const filePath = path.join(__dirname, 'uploads', 'test-new-data.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log(`Created test file: ${filePath}`);
  return filePath;
}

// Test upload with new data
async function testNewDataUpload() {
  const axios = require('axios');
  const FormData = require('form-data');
  
  const apiUrl = 'http://localhost:3001/api';
  
  console.log('=== Testing Upload with NEW Data ===\n');
  
  // Create test file
  const filePath = createTestExcelFile();
  
  // Login
  const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
    email: 'admin@company.com',
    password: 'admin123'
  });
  
  const token = loginResponse.data.token;
  console.log('✅ Login successful\n');
  
  // Upload new data
  console.log('Uploading file with NEW data...');
  const formData = new FormData();
  formData.append('attendanceFile', fs.createReadStream(filePath), 'test-new-data.xlsx');
  
  const uploadResponse = await axios.post(`${apiUrl}/admin/upload-attendance`, formData, {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = uploadResponse.data;
  console.log('✅ Upload completed\n');
  
  // Simulate frontend processing
  console.log('Processing result...');
  
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
  
  if (result.duplicatesCount && result.duplicatesCount > 0) {
    console.log('ℹ️  INFO TOAST:', `🔄 ${result.duplicatesCount} duplicate records were updated with new data`);
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total records: ${result.processedCount}`);
  console.log(`New records: ${result.summary?.newRecords || 0}`);
  console.log(`Duplicate records: ${result.summary?.duplicateRecords || 0}`);
  console.log(`Users created: ${result.summary?.createdUsers || 0}`);
  
  // Test uploading the same file again
  console.log('\n=== Uploading SAME File Again ===');
  const formData2 = new FormData();
  formData2.append('attendanceFile', fs.createReadStream(filePath), 'test-new-data.xlsx');
  
  const uploadResponse2 = await axios.post(`${apiUrl}/admin/upload-attendance`, formData2, {
    headers: {
      ...formData2.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result2 = uploadResponse2.data;
  
  let successMessage2 = `Upload completed! Processed ${result2.processedCount} records`;
  
  if (result2.summary) {
    const { newRecords, duplicateRecords, errorRecords, createdUsers } = result2.summary;
    successMessage2 = `Upload completed! ${newRecords} new records`;
    
    if (duplicateRecords > 0) {
      successMessage2 += `, ${duplicateRecords} duplicates updated`;
    }
    
    if (createdUsers > 0) {
      successMessage2 += `, ${createdUsers} users created`;
    }
  }
  
  console.log('📢 SUCCESS TOAST (2nd upload):', successMessage2);
  
  if (result2.duplicatesCount && result2.duplicatesCount > 0) {
    console.log('ℹ️  INFO TOAST (2nd upload):', `🔄 ${result2.duplicatesCount} duplicate records were updated with new data`);
  }
  
  console.log('\n=== Second Upload Summary ===');
  console.log(`Total records: ${result2.processedCount}`);
  console.log(`New records: ${result2.summary?.newRecords || 0}`);
  console.log(`Duplicate records: ${result2.summary?.duplicateRecords || 0}`);
  console.log(`Users created: ${result2.summary?.createdUsers || 0}`);
}

testNewDataUpload().catch(console.error);
