/**
 * Create external_events table for storing ISAPI device events
 */

const pool = require('./config/database');

async function createExternalEventsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating external_events table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS external_events (
        id SERIAL PRIMARY KEY,
        external_event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100),
        sub_event_type VARCHAR(100),
        event_time TIMESTAMP WITH TIME ZONE,
        card_number VARCHAR(50),
        employee_id VARCHAR(50),
        door_id VARCHAR(50),
        door_name VARCHAR(255),
        device_id VARCHAR(50),
        device_name VARCHAR(255),
        device_ip INET,
        mapped_event_type VARCHAR(100),
        raw_data JSONB,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ external_events table created successfully');
    
    // Create indexes for performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_external_events_event_time ON external_events(event_time);',
      'CREATE INDEX IF NOT EXISTS idx_external_events_card_number ON external_events(card_number);',
      'CREATE INDEX IF NOT EXISTS idx_external_events_employee_id ON external_events(employee_id);',
      'CREATE INDEX IF NOT EXISTS idx_external_events_device_id ON external_events(device_id);',
      'CREATE INDEX IF NOT EXISTS idx_external_events_mapped_type ON external_events(mapped_event_type);'
    ];
    
    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    
    console.log('✅ External events indexes created successfully');
    
    // Add card_number and employee_id columns to users table if they don't exist
    const alterUserTable = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS card_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
    `;
    
    await client.query(alterUserTable);
    console.log('✅ Users table updated with card_number and employee_id columns');
    
    // Create indexes on users table
    const userIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_card_number ON users(card_number);',
      'CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);'
    ];
    
    for (const indexQuery of userIndexes) {
      await client.query(indexQuery);
    }
    
    console.log('✅ User indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating external_events table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createExternalEventsTable()
    .then(() => {
      console.log('🎉 Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = createExternalEventsTable;