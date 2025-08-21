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

async function checkAndCreateAttendanceSettingsTable() {
    try {
        console.log('🔍 Checking for attendance_settings table...');
        
        // Check if attendance_settings table exists
        const tableCheckResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'attendance_settings'
        `);
        
        if (tableCheckResult.rows.length === 0) {
            console.log('❌ attendance_settings table not found. Creating...');
            
            // Create attendance_settings table
            await pool.query(`
                CREATE TABLE attendance_settings (
                    id SERIAL PRIMARY KEY,
                    setting_name VARCHAR(100) UNIQUE NOT NULL,
                    setting_value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Insert some default settings
            await pool.query(`
                INSERT INTO attendance_settings (setting_name, setting_value, description) VALUES
                ('work_hours_start', '09:00', 'Default work start time'),
                ('work_hours_end', '17:00', 'Default work end time'),
                ('break_duration_minutes', '60', 'Default lunch break duration in minutes'),
                ('late_tolerance_minutes', '15', 'Minutes of tolerance before marking as late'),
                ('overtime_threshold_hours', '8', 'Hours after which overtime is calculated'),
                ('weekend_work_allowed', 'false', 'Whether weekend work is allowed'),
                ('holiday_work_allowed', 'false', 'Whether work on holidays is allowed'),
                ('auto_clock_out_hours', '12', 'Hours after which to auto clock out'),
                ('require_location_check', 'false', 'Whether to require location verification for clock in/out'),
                ('max_daily_hours', '12', 'Maximum allowed working hours per day')
                ON CONFLICT (setting_name) DO NOTHING
            `);
            
            console.log('✅ attendance_settings table created with default values');
        } else {
            console.log('✅ attendance_settings table already exists');
        }
        
        // Also check for other required tables
        const tables = ['holidays', 'work_schedules'];
        for (const tableName of tables) {
            const result = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            `, [tableName]);
            
            if (result.rows.length === 0) {
                console.log(`❌ ${tableName} table not found. Creating...`);
                
                if (tableName === 'holidays') {
                    await pool.query(`
                        CREATE TABLE holidays (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            date DATE NOT NULL,
                            is_recurring BOOLEAN DEFAULT FALSE,
                            recurring_type VARCHAR(20),
                            description TEXT,
                            created_by INTEGER REFERENCES users(id),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                    
                    // Insert some sample holidays
                    await pool.query(`
                        INSERT INTO holidays (name, date, description) VALUES
                        ('New Year''s Day', '2025-01-01', 'New Year celebration'),
                        ('Independence Day', '2025-07-04', 'National Independence Day'),
                        ('Christmas Day', '2025-12-25', 'Christmas celebration')
                        ON CONFLICT DO NOTHING
                    `);
                }
                
                if (tableName === 'work_schedules') {
                    await pool.query(`
                        CREATE TABLE work_schedules (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100) NOT NULL,
                            start_time TIME NOT NULL,
                            end_time TIME NOT NULL,
                            days_of_week INTEGER[] NOT NULL,
                            is_default BOOLEAN DEFAULT FALSE,
                            description TEXT,
                            created_by INTEGER REFERENCES users(id),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `);
                    
                    // Insert default work schedule
                    await pool.query(`
                        INSERT INTO work_schedules (name, start_time, end_time, days_of_week, is_default, description) VALUES
                        ('Standard Work Week', '09:00', '17:00', '{1,2,3,4,5}', true, 'Monday to Friday, 9 AM to 5 PM')
                        ON CONFLICT DO NOTHING
                    `);
                }
                
                console.log(`✅ ${tableName} table created`);
            } else {
                console.log(`✅ ${tableName} table already exists`);
            }
        }
        
        console.log('🎉 Database schema check completed successfully!');
        
    } catch (error) {
        console.error('❌ Error checking/creating database schema:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the check
checkAndCreateAttendanceSettingsTable()
    .then(() => {
        console.log('✅ Database schema check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Database schema check failed:', error);
        process.exit(1);
    });