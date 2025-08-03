const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function testDuplicateUpload() {
  const apiUrl = 'http://localhost:3001/api';
  
  // First, login to get a token
  const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
    email: 'admin@company.com',
    password: 'admin123'
  });
  
  const token = loginResponse.data.token;
  console.log('Logged in successfully');
  
  // Find the existing Excel file
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.xlsx'));
  
  if (files.length === 0) {
    console.error('No Excel files found in uploads directory');
    return;
  }
  
  const filePath = path.join(uploadsDir, files[0]);
  console.log(`Using file: ${files[0]}`);
  
  // Upload the same file twice
  console.log('\n--- First Upload ---');
  const result1 = await uploadFile(apiUrl, token, filePath, files[0]);
  console.log('First upload result:', JSON.stringify(result1, null, 2));
  
  console.log('\n--- Second Upload (should show duplicates) ---');
  const result2 = await uploadFile(apiUrl, token, filePath, files[0]);
  console.log('Second upload result:', JSON.stringify(result2, null, 2));
  
  // Compare results
  console.log('\n--- Summary ---');
  console.log(`First upload - New records: ${result1.summary?.newRecords || 0}, Duplicates: ${result1.summary?.duplicateRecords || 0}`);
  console.log(`Second upload - New records: ${result2.summary?.newRecords || 0}, Duplicates: ${result2.summary?.duplicateRecords || 0}`);
}

async function uploadFile(apiUrl, token, filePath, fileName) {
  const formData = new FormData();
  formData.append('attendanceFile', fs.createReadStream(filePath), fileName);
  
  const response = await axios.post(`${apiUrl}/admin/upload-attendance`, formData, {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
}

testDuplicateUpload().catch(console.error);
