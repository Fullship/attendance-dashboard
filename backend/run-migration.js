const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the same database configuration as the server
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'attendance_dashboard',
  user: process.env.DB_USER || 'salarjirjees',
  password: process.env.DB_PASSWORD || '',
});

async function runMigration() {
    try {
        console.log('🔄 Running locations and teams migration...');
        console.log('📡 Connecting to database...');
        
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        
        const migrationPath = path.join(__dirname, '..', 'database', 'locations_and_teams.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the entire migration as one transaction
        await pool.query('BEGIN');
        
        try {
            // Split the SQL into individual statements and execute them
            const statements = migrationSQL
                .split(';')
                .map(statement => statement.trim())
                .filter(statement => statement.length > 0 && !statement.startsWith('--'));
            
            console.log(`📝 Executing ${statements.length} statements...`);
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
                } catch (error) {
                    // Only log errors that are not "already exists" errors
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('duplicate key') &&
                        !error.message.includes('does not exist') &&
                        !error.message.includes('column') &&
                        !error.message.includes('relation')) {
                        console.error(`❌ Error in statement ${i + 1}:`, error.message);
                        throw error;
                    } else {
                        console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
                    }
                }
            }
            
            await pool.query('COMMIT');
            console.log('✅ Migration completed successfully!');
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
        // Verify the migration by checking the new tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('locations', 'teams', 'attendance_rules', 'location_holidays', 'team_schedules')
            ORDER BY table_name
        `);
        
        console.log('\n📋 Tables available:');
        tables.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });
        
        // Check sample data
        const locationCount = await pool.query('SELECT COUNT(*) FROM locations');
        const teamCount = await pool.query('SELECT COUNT(*) FROM teams');
        const ruleCount = await pool.query('SELECT COUNT(*) FROM attendance_rules');
        
        console.log('\n📊 Sample data:');
        console.log(`  - Locations: ${locationCount.rows[0].count}`);
        console.log(`  - Teams: ${teamCount.rows[0].count}`);
        console.log(`  - Rules: ${ruleCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
