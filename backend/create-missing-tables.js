const pool = require('./config/database');

async function createMissingTables() {
    try {
        console.log('🔄 Creating missing tables...');
        
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
                description TEXT,
                location_id INTEGER REFERENCES locations(id),
                manager_id INTEGER REFERENCES users(id),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Teams table created');
        
        // Insert sample locations
        await pool.query(`
            INSERT INTO locations (name, address, timezone)
            VALUES 
                ('New York Office', '123 Broadway, New York, NY', 'America/New_York'),
                ('London Office', '456 Oxford Street, London, UK', 'Europe/London'),
                ('Tokyo Office', '789 Shibuya, Tokyo, Japan', 'Asia/Tokyo'),
                ('Dubai Office', '101 Sheikh Zayed Road, Dubai, UAE', 'Asia/Dubai')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Sample locations inserted');
        
        // Insert sample teams
        await pool.query(`
            INSERT INTO teams (name, description, location_id, manager_id)
            VALUES 
                ('Development', 'Software development team', 1, 1),
                ('Finance', 'Financial management team', 2, 1),
                ('Hiring', 'Human resources and hiring team', 3, 1),
                ('Operations', 'Operations and logistics team', 4, 1)
            ON CONFLICT DO NOTHING
        `);
        console.log('✅ Sample teams inserted');
        
        // Add team_id column to users table if not exists
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id)
        `);
        console.log('✅ Added team_id column to users table');
        
        // Update admin user to be part of Development team
        await pool.query(`
            UPDATE users SET team_id = 1 WHERE email = 'admin@company.com'
        `);
        console.log('✅ Updated admin user team assignment');
        
        console.log('🎉 All missing tables created successfully!');
        
        // Test query
        const result = await pool.query(`
            SELECT t.*, 
                   l.name as location_name, l.timezone as location_timezone,
                   m.first_name as manager_first_name, m.last_name as manager_last_name,
                   COUNT(DISTINCT u.id) as employee_count
            FROM teams t
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN users m ON t.manager_id = m.id
            LEFT JOIN users u ON t.id = u.team_id AND u.is_admin = false
            WHERE t.is_active = true
            GROUP BY t.id, t.name, t.location_id, t.description, t.manager_id, t.is_active, 
                     t.created_at, t.updated_at, l.name, l.timezone, 
                     m.first_name, m.last_name
            ORDER BY l.name NULLS LAST, t.name
            LIMIT 20 OFFSET 0
        `);
        
        console.log('🧪 Test query result:', result.rows);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

createMissingTables();
