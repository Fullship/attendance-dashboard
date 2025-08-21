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

async function createMissingTables() {
    try {
        console.log('🔄 Creating missing tables and columns...');
        
        // Add missing column to teams table
        try {
            await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
            console.log('✅ Added is_active column to teams table');
        } catch (err) {
            console.log('ℹ️  is_active column already exists in teams table');
        }
        
        try {
            await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ Added updated_at column to teams table');
        } catch (err) {
            console.log('ℹ️  updated_at column already exists in teams table');
        }
        
        // Create clock_requests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clock_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                type VARCHAR(20) NOT NULL CHECK (type IN ('clock_in', 'clock_out')),
                request_time TIMESTAMP NOT NULL,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                admin_id INTEGER REFERENCES users(id),
                admin_notes TEXT,
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Clock requests table created');
        
        // Create attendance_records table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                clock_in TIMESTAMP,
                clock_out TIMESTAMP,
                date DATE NOT NULL,
                total_hours DECIMAL(4,2),
                break_duration INTEGER DEFAULT 0,
                overtime_hours DECIMAL(4,2) DEFAULT 0,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
                location_id INTEGER REFERENCES locations(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Attendance records table created');
        
        // Create file_uploads table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS file_uploads (
                id SERIAL PRIMARY KEY,
                original_filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                upload_type VARCHAR(50),
                uploaded_by INTEGER NOT NULL REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'duplicate')),
                error_details TEXT,
                records_processed INTEGER DEFAULT 0,
                records_total INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ File uploads table created');
        
        console.log('🎉 All missing tables and columns created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
    } finally {
        await pool.end();
    }
}

createMissingTables();
