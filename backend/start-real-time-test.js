/**
 * Real-time test for ISAPI Event Listener with actual device
 */

const ISAPIEventListener = require('./services/ISAPIEventListener');
const pool = require('./config/database');

let listener;
let monitoringInterval;

async function startRealTimeTest() {
  console.log('🚀 Starting Real-Time ISAPI Device Test');
  console.log('=====================================\n');

  try {
    // Initialize listener
    listener = new ISAPIEventListener();
    
    // Set up credentials if needed (you can modify these)
    // listener.updateCredentials({ username: 'admin', password: 'admin123' });
    
    // Start listener on port 8080 (standard ISAPI port)
    console.log('📡 Starting ISAPI Event Listener on port 8080...');
    await listener.startListening(8080);
    
    console.log('✅ ISAPI Event Listener is now running!');
    console.log('\n📋 Device Configuration Instructions:');
    console.log('━'.repeat(60));
    console.log('Configure your access control device with these settings:');
    console.log(`🔗 HTTP Host: http://YOUR_SERVER_IP:8080/ISAPI/Event/notification`);
    console.log('🔗 Method: POST');
    console.log('🔗 Content-Type: application/json');
    console.log('🔗 Authentication: Basic (if required)');
    console.log('━'.repeat(60));
    
    console.log('\n🎯 Waiting for events from your device...');
    console.log('Press Ctrl+C to stop monitoring\n');
    
    // Start monitoring
    startEventMonitoring();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping real-time test...');
      await cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start real-time test:', error);
    await cleanup();
    process.exit(1);
  }
}

function startEventMonitoring() {
  let lastEventCount = 0;
  let lastEventTime = null;
  
  monitoringInterval = setInterval(async () => {
    const status = listener.getStatus();
    
    // Check if new events arrived
    if (status.eventCounts.received > lastEventCount) {
      const newEvents = status.eventCounts.received - lastEventCount;
      console.log(`\n🎉 ${newEvents} new event(s) received!`);
      
      // Get the latest events from database
      try {
        const query = `
          SELECT 
            external_event_id,
            event_type,
            mapped_event_type,
            event_time,
            card_number,
            employee_id,
            door_name,
            device_name,
            raw_data
          FROM external_events 
          WHERE processed_at > $1
          ORDER BY processed_at DESC;
        `;
        
        const since = lastEventTime || new Date(Date.now() - 60000); // Last minute if no previous time
        const result = await pool.query(query, [since]);
        
        if (result.rows.length > 0) {
          console.log('\n📊 Latest Event Details:');
          console.log('═'.repeat(80));
          
          result.rows.forEach((event, index) => {
            console.log(`\n${index + 1}. Event ID: ${event.external_event_id}`);
            console.log(`   🏷️  Event Type: ${event.event_type} → ${event.mapped_event_type}`);
            console.log(`   💳 Card Number: ${event.card_number || 'N/A'}`);
            console.log(`   👤 Employee ID: ${event.employee_id || 'N/A'}`);
            console.log(`   🚪 Door: ${event.door_name || 'N/A'}`);
            console.log(`   📱 Device: ${event.device_name || 'N/A'}`);
            console.log(`   ⏰ Time: ${event.event_time}`);
            
            // Show raw data for analysis
            if (event.raw_data) {
              console.log(`   📄 Raw Data:`);
              console.log(`      ${JSON.stringify(event.raw_data, null, 6).replace(/\n/g, '\n      ')}`);
            }
          });
          
          console.log('\n═'.repeat(80));
        }
        
      } catch (dbError) {
        console.error('❌ Error fetching latest events:', dbError.message);
      }
      
      lastEventCount = status.eventCounts.received;
    }
    
    if (status.lastEventTime && status.lastEventTime !== lastEventTime) {
      lastEventTime = status.lastEventTime;
    }
    
    // Show periodic status (every 30 seconds)
    if (Date.now() % 30000 < 1000) {
      console.log(`\n📈 Status Update: ${status.eventCounts.received} events received, ${status.eventCounts.processed} processed, ${status.eventCounts.errors} errors`);
      console.log(`⏱️  Uptime: ${Math.round(status.uptime)}s | Last Event: ${status.lastEventTime || 'Never'}`);
    }
    
  }, 1000); // Check every second
}

async function cleanup() {
  console.log('🧹 Cleaning up...');
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  if (listener) {
    try {
      await listener.stopListening();
      console.log('✅ ISAPI Event Listener stopped');
    } catch (error) {
      console.error('❌ Error stopping listener:', error.message);
    }
  }
}

async function showCurrentStatus() {
  console.log('\n📊 Current Database Status:');
  console.log('━'.repeat(40));
  
  try {
    // Count total external events
    const totalQuery = 'SELECT COUNT(*) FROM external_events';
    const totalResult = await pool.query(totalQuery);
    console.log(`📦 Total Events Stored: ${totalResult.rows[0].count}`);
    
    // Count events by type
    const typeQuery = `
      SELECT mapped_event_type, COUNT(*) as count 
      FROM external_events 
      GROUP BY mapped_event_type 
      ORDER BY count DESC;
    `;
    const typeResult = await pool.query(typeQuery);
    
    if (typeResult.rows.length > 0) {
      console.log('\n📈 Events by Type:');
      typeResult.rows.forEach(row => {
        console.log(`   ${row.mapped_event_type}: ${row.count}`);
      });
    }
    
    // Recent events
    const recentQuery = `
      SELECT event_time, mapped_event_type, card_number, employee_id
      FROM external_events 
      ORDER BY event_time DESC 
      LIMIT 5;
    `;
    const recentResult = await pool.query(recentQuery);
    
    if (recentResult.rows.length > 0) {
      console.log('\n🕒 Recent Events:');
      recentResult.rows.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_time} - ${event.mapped_event_type} (Card: ${event.card_number || 'N/A'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching database status:', error.message);
  }
  
  console.log('━'.repeat(40));
}

// Show initial status
showCurrentStatus().then(() => {
  startRealTimeTest();
});

module.exports = { startRealTimeTest, cleanup };