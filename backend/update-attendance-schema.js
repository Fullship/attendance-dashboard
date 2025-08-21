const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !line.startsWith('#')) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'attendance_dashboard_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function updateAttendanceSchema() {
    try {
        console.log('🔄 Updating attendance_records schema for API integration...');
        
        // Add data_source column to track where attendance data comes from
        try {
            await pool.query(`
                ALTER TABLE attendance_records 
                ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'manual'
            `);
            console.log('✅ Added data_source column to attendance_records table');
        } catch (err) {
            console.log('ℹ️  data_source column already exists in attendance_records table');
        }
        
        // Add created_at and updated_at if they don't exist
        try {
            await pool.query(`
                ALTER TABLE attendance_records 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ Added created_at column to attendance_records table');
        } catch (err) {
            console.log('ℹ️  created_at column already exists in attendance_records table');
        }
        
        try {
            await pool.query(`
                ALTER TABLE attendance_records 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ Added updated_at column to attendance_records table');
        } catch (err) {
            console.log('ℹ️  updated_at column already exists in attendance_records table');
        }
        
        // Create index on data_source for better query performance
        try {
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_attendance_records_data_source 
                ON attendance_records(data_source)
            `);
            console.log('✅ Created index on data_source column');
        } catch (err) {
            console.log('ℹ️  Index on data_source already exists');
        }
        
        // Create composite index for user_id + date + data_source (for conflict detection)
        try {
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date_source 
                ON attendance_records(user_id, date, data_source)
            `);
            console.log('✅ Created composite index for conflict detection');
        } catch (err) {
            console.log('ℹ️  Composite index already exists');
        }
        
        // Create external_attendance_sync_log table to track API sync operations
        await pool.query(`
            CREATE TABLE IF NOT EXISTS external_attendance_sync_log (
                id SERIAL PRIMARY KEY,
                sync_id VARCHAR(100) UNIQUE NOT NULL,
                source VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'in_progress',
                records_processed INTEGER DEFAULT 0,
                records_created INTEGER DEFAULT 0,
                records_updated INTEGER DEFAULT 0,
                records_skipped INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_completed_at TIMESTAMP,
                sync_details JSONB,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created external_attendance_sync_log table');
        
        // Update existing records to have data_source = 'manual' if NULL
        const updateResult = await pool.query(`
            UPDATE attendance_records 
            SET data_source = 'manual' 
            WHERE data_source IS NULL
        `);
        console.log(`✅ Updated ${updateResult.rowCount} existing records with data_source = 'manual'`);
        
        console.log('🎉 Attendance schema update completed successfully!');
        
    } catch (error) {
        console.error('❌ Error updating attendance schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the update
updateAttendanceSchema()
    .then(() => {
        console.log('✅ Schema update completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Schema update failed:', error);
        process.exit(1);
    });