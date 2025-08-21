/**
 * Test script for ISAPI Event Listener implementation
 */

const axios = require('axios');

async function testISAPIImplementation() {
  console.log('🧪 Testing ISAPI Event Listener Implementation');
  console.log('=============================================\n');

  try {
    // 1. Test if ISAPI listener can be created directly
    console.log('1️⃣ Testing ISAPI Event Listener instantiation...');
    const ISAPIEventListener = require('./services/ISAPIEventListener');
    const listener = new ISAPIEventListener();
    
    console.log('✅ ISAPI Event Listener created successfully');
    console.log('📊 Initial status:', listener.getStatus());
    console.log('');

    // 2. Test starting the listener on a test port
    console.log('2️⃣ Testing listener startup...');
    const testPort = 8081; // Use different port to avoid conflicts
    
    try {
      const startResult = await listener.startListening(testPort);
      console.log('✅ Listener started successfully:', startResult);
      console.log('📊 Status after start:', listener.getStatus());
      console.log('');

      // 3. Test sending a mock event to the listener
      console.log('3️⃣ Testing event reception...');
      
      const mockEvent = {
        EventNotificationAlert: {
          eventId: 'test_event_001',
          eventType: '75001',
          time: new Date().toISOString(),
          cardNo: '12345678',
          employeeNoString: 'EMP001',
          doorId: 'DOOR001',
          doorName: 'Main Entrance',
          deviceId: 'DEV001',
          deviceName: 'Access Control Panel'
        }
      };

      // Send test event
      const eventResponse = await axios.post(`http://localhost:${testPort}/ISAPI/Event/notification`, mockEvent, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      console.log('✅ Event sent successfully. Response:', eventResponse.data);
      console.log('📊 Status after event:', listener.getStatus());
      console.log('');

      // 4. Test health endpoint
      console.log('4️⃣ Testing health endpoint...');
      const healthResponse = await axios.get(`http://localhost:${testPort}/health`);
      console.log('✅ Health check successful:', healthResponse.data);
      console.log('');

      // 5. Test credentials functionality
      console.log('5️⃣ Testing credentials...');
      listener.updateCredentials({ username: 'testuser', password: 'testpass' });
      console.log('✅ Credentials updated');
      console.log('📊 Status with credentials:', listener.getStatus());
      console.log('');

      // 6. Test stopping the listener
      console.log('6️⃣ Testing listener shutdown...');
      const stopResult = await listener.stopListening();
      console.log('✅ Listener stopped successfully:', stopResult);
      console.log('📊 Final status:', listener.getStatus());
      console.log('');

    } catch (startError) {
      console.error('❌ Failed to start listener:', startError.message);
      
      // Try to stop if it was started
      try {
        await listener.stopListening();
      } catch (stopError) {
        // Ignore stop errors if start failed
      }
    }

    // 7. Test database table existence
    console.log('7️⃣ Testing database setup...');
    const pool = require('./config/database');
    const tableCheckQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'external_events' 
      ORDER BY ordinal_position;
    `;
    
    const tableResult = await pool.query(tableCheckQuery);
    if (tableResult.rows.length > 0) {
      console.log('✅ external_events table exists with columns:');
      tableResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ external_events table not found');
    }
    console.log('');

    // 8. Test users table updates
    console.log('8️⃣ Testing users table updates...');
    const usersCheckQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('card_number', 'employee_id')
      ORDER BY column_name;
    `;
    
    const usersResult = await pool.query(usersCheckQuery);
    if (usersResult.rows.length === 2) {
      console.log('✅ Users table has required columns:');
      usersResult.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ Users table missing required columns');
    }

    console.log('\n🎉 ISAPI Implementation Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Configure your access control device:');
    console.log('   - Set HTTP notification URL to: http://YOUR_SERVER_IP:8080/ISAPI/Event/notification');
    console.log('   - Enable event notifications for card swipe events');
    console.log('   - Set authentication method to Basic (if required)');
    console.log('2. Use the admin panel to start the ISAPI listener');
    console.log('3. Add card numbers and employee IDs to user profiles for automatic matching');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testISAPIImplementation().then(() => {
    console.log('\n✨ Test script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
}

module.exports = testISAPIImplementation;