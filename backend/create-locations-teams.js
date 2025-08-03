require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'attendance_dashboard',
  user: process.env.DB_USER || 'salarjirjees',
  password: process.env.DB_PASSWORD || '',
});

async function createTablesStep() {
    try {
        console.log('🔄 Creating locations and teams tables...');
        
        // Create locations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                address TEXT,
                timezone VARCHAR(50) DEFAULT 'UTC',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Locations table created');
        
        // Create teams table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
                description TEXT,
                manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, location_id)
            )
        `);
        console.log('✅ Teams table created');
        
        // Add columns to users table
        try {
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL');
            console.log('✅ Added location_id to users table');
        } catch (error) {
            console.log('⚠️  location_id column already exists');
        }
        
        try {
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL');
            console.log('✅ Added team_id to users table');
        } catch (error) {
            console.log('⚠️  team_id column already exists');
        }
        
        // Create attendance_rules table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_rules (
                id SERIAL PRIMARY KEY,
                rule_name VARCHAR(100) NOT NULL,
                rule_type VARCHAR(50) NOT NULL,
                target_id INTEGER,
                rule_key VARCHAR(100) NOT NULL,
                rule_value TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(rule_type, target_id, rule_key)
            )
        `);
        console.log('✅ Attendance rules table created');
        
        // Create location_holidays table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS location_holidays (
                id SERIAL PRIMARY KEY,
                location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
                holiday_name VARCHAR(100) NOT NULL,
                holiday_date DATE NOT NULL,
                is_recurring BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(location_id, holiday_date, holiday_name)
            )
        `);
        console.log('✅ Location holidays table created');
        
        // Create team_schedules table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_schedules (
                id SERIAL PRIMARY KEY,
                team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_working_day BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, day_of_week)
            )
        `);
        console.log('✅ Team schedules table created');
        
        console.log('\n🎉 All tables created successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        return false;
    }
}

async function insertSampleData() {
    try {
        console.log('\n📝 Inserting sample data...');
        
        // Insert sample locations
        const locationResult = await pool.query(`
            INSERT INTO locations (name, address, timezone) VALUES
                ('Main Office', '123 Business St, City, State 12345', 'America/New_York'),
                ('Remote Hub', 'Virtual Location', 'UTC'),
                ('West Coast Branch', '456 Tech Ave, San Francisco, CA 94102', 'America/Los_Angeles'),
                ('Dubai Office', 'Business Bay, Dubai, UAE', 'Asia/Dubai'),
                ('Baghdad Branch', 'Karrada District, Baghdad, Iraq', 'Asia/Baghdad'),
                ('Riyadh Center', 'King Fahd Road, Riyadh, Saudi Arabia', 'Asia/Riyadh'),
                ('Kuwait City Office', 'Kuwait City, Kuwait', 'Asia/Kuwait')
            ON CONFLICT (name) DO NOTHING
            RETURNING id, name
        `);
        console.log(`✅ Inserted ${locationResult.rows.length} locations`);
        
        // Get location IDs for teams
        const locations = await pool.query('SELECT id, name FROM locations ORDER BY id');
        const locationMap = {};
        locations.rows.forEach(loc => {
            locationMap[loc.name] = loc.id;
        });
        
        // Insert sample teams for each location
        const teamsToInsert = [
            // Main Office teams
            ['Engineering', locationMap['Main Office'], 'Software development team'],
            ['Marketing', locationMap['Main Office'], 'Marketing and communications team'],
            ['Sales', locationMap['Main Office'], 'Sales and business development team'],
            
            // Remote Hub teams
            ['Remote Engineering', locationMap['Remote Hub'], 'Remote software development team'],
            ['Remote Support', locationMap['Remote Hub'], 'Remote customer support team'],
            
            // West Coast teams
            ['West Coast Sales', locationMap['West Coast Branch'], 'West coast sales team'],
            ['West Coast Engineering', locationMap['West Coast Branch'], 'West coast development team'],
            
            // Middle East teams
            ['Dubai Operations', locationMap['Dubai Office'], 'Regional operations team for MENA'],
            ['Dubai Sales', locationMap['Dubai Office'], 'Sales team for UAE and GCC'],
            ['Baghdad Support', locationMap['Baghdad Branch'], 'Customer support for Iraq region'],
            ['Baghdad Operations', locationMap['Baghdad Branch'], 'Local operations team'],
            ['Riyadh Management', locationMap['Riyadh Center'], 'Regional management team'],
            ['Riyadh Sales', locationMap['Riyadh Center'], 'Sales team for Saudi Arabia'],
            ['Kuwait Operations', locationMap['Kuwait City Office'], 'Kuwait regional operations'],
            ['Kuwait Finance', locationMap['Kuwait City Office'], 'Regional finance team']
        ].filter(team => team[1]); // Only include teams where location exists
        
        if (teamsToInsert.length > 0) {
            const teamValues = teamsToInsert.map((_, index) => {
                const baseIndex = index * 3;
                return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
            }).join(', ');
            
            const teamParams = teamsToInsert.flat();
            
            const teamResult = await pool.query(`
                INSERT INTO teams (name, location_id, description) VALUES ${teamValues}
                ON CONFLICT (name, location_id) DO NOTHING
                RETURNING id, name
            `, teamParams);
            console.log(`✅ Inserted ${teamResult.rows.length} teams`);
        }
        
        // Insert sample attendance rules for different locations
        const locationRules = [
            // Main Office (New York)
            [locationMap['Main Office'], 'work_start_time', '09:00', 'Standard work start time for main office'],
            [locationMap['Main Office'], 'work_end_time', '17:00', 'Standard work end time for main office'],
            [locationMap['Main Office'], 'late_threshold_minutes', '15', 'Minutes after start time considered late'],
            
            // Remote Hub
            [locationMap['Remote Hub'], 'work_start_time', '08:00', 'Flexible start time for remote workers'],
            [locationMap['Remote Hub'], 'work_end_time', '16:00', 'Flexible end time for remote workers'],
            [locationMap['Remote Hub'], 'late_threshold_minutes', '30', 'More flexible late threshold for remote'],
            
            // West Coast
            [locationMap['West Coast Branch'], 'work_start_time', '09:00', 'Pacific time zone work hours'],
            [locationMap['West Coast Branch'], 'work_end_time', '17:00', 'Pacific time zone work hours'],
            
            // Dubai Office
            [locationMap['Dubai Office'], 'work_start_time', '08:00', 'UAE standard work hours (Sunday-Thursday)'],
            [locationMap['Dubai Office'], 'work_end_time', '17:00', 'UAE standard work hours'],
            [locationMap['Dubai Office'], 'late_threshold_minutes', '10', 'Strict punctuality policy'],
            [locationMap['Dubai Office'], 'weekend_days', 'Friday,Saturday', 'UAE weekend schedule'],
            
            // Baghdad Branch
            [locationMap['Baghdad Branch'], 'work_start_time', '08:30', 'Iraq standard work hours'],
            [locationMap['Baghdad Branch'], 'work_end_time', '16:30', 'Iraq standard work hours'],
            [locationMap['Baghdad Branch'], 'late_threshold_minutes', '20', 'Flexible late policy'],
            [locationMap['Baghdad Branch'], 'weekend_days', 'Friday,Saturday', 'Iraq weekend schedule'],
            
            // Riyadh Center
            [locationMap['Riyadh Center'], 'work_start_time', '08:00', 'Saudi Arabia standard work hours'],
            [locationMap['Riyadh Center'], 'work_end_time', '17:00', 'Saudi Arabia standard work hours'],
            [locationMap['Riyadh Center'], 'late_threshold_minutes', '15', 'Standard late threshold'],
            [locationMap['Riyadh Center'], 'weekend_days', 'Friday,Saturday', 'Saudi weekend schedule'],
            
            // Kuwait City Office
            [locationMap['Kuwait City Office'], 'work_start_time', '07:30', 'Kuwait standard work hours'],
            [locationMap['Kuwait City Office'], 'work_end_time', '15:30', 'Kuwait standard work hours'],
            [locationMap['Kuwait City Office'], 'late_threshold_minutes', '10', 'Punctuality focused policy'],
            [locationMap['Kuwait City Office'], 'weekend_days', 'Friday,Saturday', 'Kuwait weekend schedule']
        ].filter(rule => rule[0]); // Only include rules where location exists
        
        if (locationRules.length > 0) {
            const ruleValues = locationRules.map((_, index) => {
                const baseIndex = index * 4;
                return `('Location Rule', 'location', $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
            }).join(', ');
            
            const ruleParams = locationRules.flat();
            
            await pool.query(`
                INSERT INTO attendance_rules (rule_name, rule_type, target_id, rule_key, rule_value, description) VALUES ${ruleValues}
                ON CONFLICT (rule_type, target_id, rule_key) DO NOTHING
            `, ruleParams);
            console.log('✅ Inserted location-specific rules for all regions');
        }
        
        console.log('\n🎉 Sample data inserted successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error inserting sample data:', error.message);
        return false;
    }
}

async function verifyMigration() {
    try {
        console.log('\n🔍 Verifying migration...');
        
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('locations', 'teams', 'attendance_rules', 'location_holidays', 'team_schedules')
            ORDER BY table_name
        `);
        
        console.log('📋 Tables created:');
        tables.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
        // Check sample data
        const locationCount = await pool.query('SELECT COUNT(*) FROM locations');
        const teamCount = await pool.query('SELECT COUNT(*) FROM teams');
        const ruleCount = await pool.query('SELECT COUNT(*) FROM attendance_rules');
        
        console.log('\n📊 Data summary:');
        console.log(`  - Locations: ${locationCount.rows[0].count}`);
        console.log(`  - Teams: ${teamCount.rows[0].count}`);
        console.log(`  - Rules: ${ruleCount.rows[0].count}`);
        
        // Show sample locations and teams
        const locationsData = await pool.query('SELECT * FROM locations LIMIT 3');
        const teamsData = await pool.query(`
            SELECT t.*, l.name as location_name 
            FROM teams t 
            LEFT JOIN locations l ON t.location_id = l.id 
            LIMIT 5
        `);
        
        console.log('\n🏢 Sample Locations:');
        locationsData.rows.forEach(loc => {
            console.log(`  - ${loc.name} (${loc.timezone})`);
        });
        
        console.log('\n👥 Sample Teams:');
        teamsData.rows.forEach(team => {
            console.log(`  - ${team.name} @ ${team.location_name}`);
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error verifying migration:', error.message);
        return false;
    }
}

async function runMigration() {
    try {
        console.log('🚀 Starting Locations and Teams Migration');
        console.log('=====================================\n');
        
        const tablesCreated = await createTablesStep();
        if (!tablesCreated) {
            throw new Error('Failed to create tables');
        }
        
        const dataInserted = await insertSampleData();
        if (!dataInserted) {
            console.log('⚠️  Sample data insertion failed, but tables were created');
        }
        
        await verifyMigration();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('You can now use the locations and teams feature.');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
