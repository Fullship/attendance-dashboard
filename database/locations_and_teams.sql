-- Add locations and teams feature to the database

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
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
);

-- Add location_id and team_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

-- Create attendance_rules table to replace the current attendance_settings
CREATE TABLE IF NOT EXISTS attendance_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'global', 'location', 'team'
    target_id INTEGER, -- null for global, location_id for location rules, team_id for team rules
    rule_key VARCHAR(100) NOT NULL,
    rule_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rule_type, target_id, rule_key)
);

-- Create location_specific_holidays table
CREATE TABLE IF NOT EXISTS location_holidays (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    holiday_name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, holiday_date, holiday_name)
);

-- Create team_specific_schedules table
CREATE TABLE IF NOT EXISTS team_schedules (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working_day BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, day_of_week)
);

-- Insert sample locations
INSERT INTO locations (name, address, timezone) VALUES
    ('Main Office', '123 Business St, City, State 12345', 'America/New_York'),
    ('Remote Hub', 'Virtual Location', 'UTC'),
    ('West Coast Branch', '456 Tech Ave, San Francisco, CA 94102', 'America/Los_Angeles')
ON CONFLICT (name) DO NOTHING;

-- Insert sample teams
INSERT INTO teams (name, location_id, description) VALUES
    ('Engineering', 1, 'Software development team'),
    ('Marketing', 1, 'Marketing and communications team'),
    ('Sales', 1, 'Sales and business development team'),
    ('Remote Engineering', 2, 'Remote software development team'),
    ('West Coast Sales', 3, 'West coast sales team')
ON CONFLICT (name, location_id) DO NOTHING;

-- Migrate existing attendance_settings to attendance_rules (global rules)
INSERT INTO attendance_rules (rule_name, rule_type, target_id, rule_key, rule_value, description)
SELECT 
    setting_name as rule_name,
    'global' as rule_type,
    NULL as target_id,
    setting_key as rule_key,
    setting_value as rule_value,
    description
FROM attendance_settings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_settings')
ON CONFLICT (rule_type, target_id, rule_key) DO NOTHING;

-- Add sample location-specific rules
INSERT INTO attendance_rules (rule_name, rule_type, target_id, rule_key, rule_value, description) VALUES
    ('Main Office Work Hours', 'location', 1, 'work_start_time', '09:00', 'Standard work start time for main office'),
    ('Main Office Work Hours', 'location', 1, 'work_end_time', '17:00', 'Standard work end time for main office'),
    ('Main Office Late Threshold', 'location', 1, 'late_threshold_minutes', '15', 'Minutes after start time considered late'),
    ('Remote Hub Work Hours', 'location', 2, 'work_start_time', '08:00', 'Flexible start time for remote workers'),
    ('Remote Hub Work Hours', 'location', 2, 'work_end_time', '16:00', 'Flexible end time for remote workers'),
    ('West Coast Work Hours', 'location', 3, 'work_start_time', '09:00', 'Pacific time zone work hours'),
    ('West Coast Work Hours', 'location', 3, 'work_end_time', '17:00', 'Pacific time zone work hours')
ON CONFLICT (rule_type, target_id, rule_key) DO NOTHING;

-- Add sample team-specific rules
INSERT INTO attendance_rules (rule_name, rule_type, target_id, rule_key, rule_value, description) VALUES
    ('Engineering Flexibility', 'team', 1, 'flexible_hours', 'true', 'Engineering team has flexible hours'),
    ('Engineering Core Hours', 'team', 1, 'core_hours_start', '10:00', 'Core collaboration hours start'),
    ('Engineering Core Hours', 'team', 1, 'core_hours_end', '15:00', 'Core collaboration hours end'),
    ('Sales Early Start', 'team', 3, 'work_start_time', '08:00', 'Sales team starts early for client calls'),
    ('Remote Engineering Hours', 'team', 4, 'work_hours_per_day', '8', 'Required hours per day for remote engineering')
ON CONFLICT (rule_type, target_id, rule_key) DO NOTHING;

-- Insert sample location holidays
INSERT INTO location_holidays (location_id, holiday_name, holiday_date, is_recurring) VALUES
    (1, 'Main Office Founding Day', '2025-03-15', true),
    (3, 'West Coast Innovation Day', '2025-06-10', true)
ON CONFLICT (location_id, holiday_date, holiday_name) DO NOTHING;

-- Insert sample team schedules
INSERT INTO team_schedules (team_id, day_of_week, start_time, end_time, is_working_day) VALUES
    -- Engineering team (5-day week, flexible)
    (1, 1, '09:00', '17:00', true), -- Monday
    (1, 2, '09:00', '17:00', true), -- Tuesday  
    (1, 3, '09:00', '17:00', true), -- Wednesday
    (1, 4, '09:00', '17:00', true), -- Thursday
    (1, 5, '09:00', '17:00', true), -- Friday
    (1, 6, '09:00', '17:00', false), -- Saturday (non-working)
    (1, 0, '09:00', '17:00', false), -- Sunday (non-working)
    
    -- Sales team (6-day week)
    (3, 1, '08:00', '16:00', true), -- Monday
    (3, 2, '08:00', '16:00', true), -- Tuesday
    (3, 3, '08:00', '16:00', true), -- Wednesday
    (3, 4, '08:00', '16:00', true), -- Thursday
    (3, 5, '08:00', '16:00', true), -- Friday
    (3, 6, '08:00', '14:00', true), -- Saturday (half day)
    (3, 0, '08:00', '16:00', false) -- Sunday (non-working)
ON CONFLICT (team_id, day_of_week) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_location ON teams(location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_type_target ON attendance_rules(rule_type, target_id);
CREATE INDEX IF NOT EXISTS idx_location_holidays_location_date ON location_holidays(location_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_team_schedules_team_day ON team_schedules(team_id, day_of_week);
