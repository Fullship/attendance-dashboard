-- Database Schema for Attendance Dashboard
-- Run this after connecting PostgreSQL database in Coolify

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_id INTEGER,
    team_id INTEGER
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    break_start TIMESTAMP,
    break_end TIMESTAMP,
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location_id INTEGER REFERENCES locations(id),
    manager_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, is_admin) 
VALUES (
    'admin@company.com', 
    '$2a$10$x1WPdGbvTgml3d.Iv9cVleQCVTlb9.t/nJJd2SXUzPCwUXiq/61bm', 
    'Admin', 
    'User', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, is_admin) 
VALUES (
    'testadmin@example.com', 
    '$2a$10$SukRjrekKHPBcCAFzEuLj.n/NMD6AMcb3EY6smdVMpEcdimAwg9vO', 
    'Test', 
    'Admin', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample regular users (password: user123)
INSERT INTO users (email, password_hash, first_name, last_name, is_admin) 
VALUES 
    ('john.doe@company.com', '$2b$10$8K7Vq4HZQ3fOtIgN8oEfHeX0LQx9K8p.9BxQ2VR1oQ8XQ3hO0Nx/i', 'John', 'Doe', false),
    ('jane.smith@company.com', '$2b$10$8K7Vq4HZQ3fOtIgN8oEfHeX0LQx9K8p.9BxQ2VR1oQ8XQ3hO0Nx/i', 'Jane', 'Smith', false),
    ('mike.johnson@company.com', '$2b$10$8K7Vq4HZQ3fOtIgN8oEfHeX0LQx9K8p.9BxQ2VR1oQ8XQ3hO0Nx/i', 'Mike', 'Johnson', false)
ON CONFLICT (email) DO NOTHING;

-- Insert default location
INSERT INTO locations (name, address, city, country, timezone) 
VALUES ('Main Office', '123 Business St', 'Dubai', 'UAE', 'Asia/Dubai')
ON CONFLICT DO NOTHING;

-- Insert default team
INSERT INTO teams (name, description, location_id) 
VALUES ('Development Team', 'Software development team', 1)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

COMMIT;
