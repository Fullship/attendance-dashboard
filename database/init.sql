-- Create database and tables for attendance management system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    hours_worked DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late, early_leave
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create file_uploads table for tracking CSV uploads
CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    records_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, is_admin) 
VALUES ('admin@company.com', '$2b$10$8K7Vq4HZQ3fOtY3BcFXxb.Q2YY6vJ7gFrWQV4FGfW8V2.WK8VrPE2', 'Admin', 'User', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample employees
INSERT INTO users (email, password, first_name, last_name, is_admin) 
VALUES 
    ('john.doe@company.com', '$2b$10$8K7Vq4HZQ3fOtY3BcFXxb.Q2YY6vJ7gFrWQV4FGfW8V2.WK8VrPE2', 'John', 'Doe', FALSE),
    ('jane.smith@company.com', '$2b$10$8K7Vq4HZQ3fOtY3BcFXxb.Q2YY6vJ7gFrWQV4FGfW8V2.WK8VrPE2', 'Jane', 'Smith', FALSE),
    ('mike.johnson@company.com', '$2b$10$8K7Vq4HZQ3fOtY3BcFXxb.Q2YY6vJ7gFrWQV4FGfW8V2.WK8VrPE2', 'Mike', 'Johnson', FALSE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample attendance data
INSERT INTO attendance_records (user_id, date, clock_in, clock_out, hours_worked, status) VALUES
(2, CURRENT_DATE - INTERVAL '7 days', '09:00:00', '17:30:00', 8.5, 'present'),
(2, CURRENT_DATE - INTERVAL '6 days', '09:15:00', '17:30:00', 8.25, 'late'),
(2, CURRENT_DATE - INTERVAL '5 days', NULL, NULL, 0, 'absent'),
(2, CURRENT_DATE - INTERVAL '4 days', '08:45:00', '17:00:00', 8.25, 'present'),
(2, CURRENT_DATE - INTERVAL '3 days', '09:00:00', '16:30:00', 7.5, 'early_leave'),
(3, CURRENT_DATE - INTERVAL '7 days', '08:30:00', '17:00:00', 8.5, 'present'),
(3, CURRENT_DATE - INTERVAL '6 days', '08:45:00', '17:15:00', 8.5, 'present'),
(3, CURRENT_DATE - INTERVAL '5 days', '09:00:00', '17:30:00', 8.5, 'present'),
(3, CURRENT_DATE - INTERVAL '4 days', '08:30:00', '17:00:00', 8.5, 'present'),
(3, CURRENT_DATE - INTERVAL '3 days', '09:30:00', '17:30:00', 8, 'late'),
(4, CURRENT_DATE - INTERVAL '7 days', '09:00:00', '18:00:00', 9, 'present'),
(4, CURRENT_DATE - INTERVAL '6 days', NULL, NULL, 0, 'absent'),
(4, CURRENT_DATE - INTERVAL '5 days', '09:15:00', '17:45:00', 8.5, 'late'),
(4, CURRENT_DATE - INTERVAL '4 days', '08:45:00', '17:30:00', 8.75, 'present'),
(4, CURRENT_DATE - INTERVAL '3 days', '09:00:00', '17:00:00', 8, 'present')
ON CONFLICT (user_id, date) DO NOTHING;
