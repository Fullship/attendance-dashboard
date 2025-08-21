/**
 * Check external events in database
 */

const pool = require('./config/database');

async function checkExternalEvents() {
  try {
    console.log('🔍 Checking external events in database...\n');
    
    const query = `
      SELECT 
        id,
        external_event_id,
        event_type,
        mapped_event_type,
        event_time,
        card_number,
        employee_id,
        door_name,
        device_name,
        processed_at
      FROM external_events 
      ORDER BY id DESC 
      LIMIT 5;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('📭 No external events found in database');
    } else {
      console.log(`📊 Found ${result.rows.length} external events:`);
      console.log('═'.repeat(80));
      
      result.rows.forEach((event, index) => {
        console.log(`${index + 1}. Event ID: ${event.external_event_id}`);
        console.log(`   Event Type: ${event.event_type} → ${event.mapped_event_type}`);
        console.log(`   Card Number: ${event.card_number}`);
        console.log(`   Employee ID: ${event.employee_id}`);
        console.log(`   Door: ${event.door_name}`);
        console.log(`   Device: ${event.device_name}`);
        console.log(`   Event Time: ${event.event_time}`);
        console.log(`   Processed: ${event.processed_at}`);
        console.log('─'.repeat(40));
      });
    }
    
    // Also check if any attendance records were created
    const attendanceQuery = `
      SELECT 
        ar.*,
        u.first_name,
        u.last_name,
        u.card_number
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE ar.source = 'external_device'
      ORDER BY ar.id DESC
      LIMIT 3;
    `;
    
    const attendanceResult = await pool.query(attendanceQuery);
    
    if (attendanceResult.rows.length === 0) {
      console.log('\n📋 No attendance records from external devices found');
      console.log('💡 This is expected since the test used fake employee data');
    } else {
      console.log(`\n📋 Found ${attendanceResult.rows.length} attendance records from external devices:`);
      attendanceResult.rows.forEach((record, index) => {
        console.log(`${index + 1}. ${record.first_name} ${record.last_name} (Card: ${record.card_number})`);
        console.log(`   Clock In: ${record.clock_in_time}`);
        console.log(`   Clock Out: ${record.clock_out_time}`);
        console.log(`   External Event ID: ${record.external_event_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking external events:', error);
  }
}

// Run if called directly
if (require.main === module) {
  checkExternalEvents()
    .then(() => {
      console.log('\n✅ Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database check failed:', error);
      process.exit(1);
    });
}

module.exports = checkExternalEvents;