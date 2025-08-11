-- Attendance Dashboard Database Initialization
-- Run this after creating the database and connecting as attendance_user

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    department VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clock_requests table
CREATE TABLE IF NOT EXISTS clock_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- 'clock_in' or 'clock_out'
    requested_time TIMESTAMP NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    date DATE NOT NULL,
    total_hours DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password is 'admin123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_admin) 
VALUES (
    'admin',
    'admin@company.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'Admin',
    'User',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clock_requests_user_id ON clock_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);

-- Display success message
SELECT 'Database initialization completed successfully!' as message;
