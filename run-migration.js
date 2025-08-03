const fs = require('fs');
const path = require('path');
// Remove dotenv for now and use direct connection
const pool = require('./backend/config/database');

async function runMigration() {
    try {
        console.log('🔄 Running locations and teams migration...');
        
        const migrationPath = path.join(__dirname, 'database', 'locations_and_teams.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split the SQL into individual statements and execute them
        const statements = migrationSQL
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);
        
        for (const statement of statements) {
            try {
                await pool.query(statement);
                console.log('✅ Executed statement successfully');
            } catch (error) {
                // Only log errors that are not "already exists" errors
                if (!error.message.includes('already exists') && 
                    !error.message.includes('duplicate key') &&
                    !error.message.includes('does not exist')) {
                    console.error('❌ Error executing statement:', error.message);
                    console.error('Statement:', statement.substring(0, 100) + '...');
                }
            }
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Verify the migration by checking the new tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('locations', 'teams', 'attendance_rules', 'location_holidays', 'team_schedules')
            ORDER BY table_name
        `);
        
        console.log('\n📋 New tables created:');
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Check if columns were added to users table
        const userColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('location_id', 'team_id')
        `);
        
        console.log('\n👥 User table columns added:');
        userColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runMigration();
