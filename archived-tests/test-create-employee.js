const axios = require('axios');

async function testCreateEmployee() {
  const apiUrl = 'http://localhost:3001/api';
  
  try {
    // First, login to get a token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${apiUrl}/auth/login`, {
      email: 'admin@company.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Test creating a new employee
    console.log('2. Creating a new employee...');
    const newEmployee = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: `jane.smith.${Date.now()}@company.com`, // Use unique email
      password: 'password123',
      isAdmin: false
    };
    
    const createResponse = await axios.post(`${apiUrl}/admin/employees`, newEmployee, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Employee created successfully!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    
    // Test creating a duplicate (should fail)
    console.log('\n3. Testing duplicate email (should fail)...');
    try {
      await axios.post(`${apiUrl}/admin/employees`, newEmployee, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Duplicate should have failed!');
    } catch (error) {
      console.log('✅ Duplicate correctly rejected:', error.response.data.message);
    }
    
    // Test with missing fields (should fail)
    console.log('\n4. Testing missing fields (should fail)...');
    try {
      await axios.post(`${apiUrl}/admin/employees`, {
        firstName: 'Test',
        // missing other fields
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Missing fields should have failed!');
    } catch (error) {
      console.log('✅ Missing fields correctly rejected:', error.response.data.message);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCreateEmployee();
