-- Fix missing database schema for full application functionality
-- This script adds missing tables and columns needed for the application

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attendance_rules table
CREATE TABLE IF NOT EXISTS attendance_rules (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'working_hours', 'break_time', 'overtime', etc.
    configuration JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

-- Add missing column to clock_requests table
ALTER TABLE clock_requests 
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_location_id ON attendance_rules(location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_team_id ON attendance_rules(team_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_active ON attendance_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_clock_requests_reviewed_by ON clock_requests(reviewed_by);

-- Create trigger functions for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_rules_updated_at ON attendance_rules;
CREATE TRIGGER update_attendance_rules_updated_at
    BEFORE UPDATE ON attendance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default teams
INSERT INTO teams (name, description) VALUES 
('Development', 'Software development team'),
('Support', 'Customer support team'),
('Sales', 'Sales and marketing team'),
('HR', 'Human resources team')
ON CONFLICT DO NOTHING;

-- Insert some default attendance rules
INSERT INTO attendance_rules (name, rule_type, configuration, location_id) VALUES
('Standard Working Hours', 'working_hours', '{"start_time": "09:00", "end_time": "17:00", "timezone": "UTC"}', 1),
('Lunch Break', 'break_time', '{"start_time": "12:00", "end_time": "13:00", "required": true}', 1),
('Overtime Rule', 'overtime', '{"threshold_hours": 8, "multiplier": 1.5}', 1)
ON CONFLICT DO NOTHING;

-- Update existing users with default location and team (optional)
-- This assigns all existing users to the first location and first team
UPDATE users 
SET location_id = (SELECT id FROM locations LIMIT 1),
    team_id = (SELECT id FROM teams LIMIT 1)
WHERE location_id IS NULL OR team_id IS NULL;

COMMIT;
