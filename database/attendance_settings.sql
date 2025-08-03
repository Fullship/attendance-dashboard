-- Add system settings tables for attendance rules and configuration

-- Create attendance_settings table for general attendance rules
CREATE TABLE IF NOT EXISTS attendance_settings (
    id SERIAL PRIMARY KEY,
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    setting_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, time, json
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create holidays table for company holidays
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE, -- true for annual holidays like Christmas
    recurring_type VARCHAR(20), -- 'annual', 'monthly', 'weekly'
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work_schedules table for defining standard work hours
CREATE TABLE IF NOT EXISTS work_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INTEGER[] NOT NULL, -- Array of day numbers: 1=Monday, 7=Sunday
    is_default BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default attendance settings
INSERT INTO attendance_settings (setting_name, setting_value, description, setting_type) VALUES
('late_threshold_minutes', '15', 'Number of minutes after scheduled start time to consider late', 'number'),
('early_departure_threshold_minutes', '30', 'Number of minutes before scheduled end time to consider early departure', 'number'),
('minimum_work_hours', '8', 'Minimum number of hours required for a full day', 'number'),
('grace_period_minutes', '5', 'Grace period for clock-in without penalty', 'number'),
('overtime_threshold_hours', '8', 'Hours after which overtime calculation begins', 'number'),
('weekend_work_allowed', 'false', 'Whether employees can work on weekends', 'boolean'),
('holiday_pay_multiplier', '1.5', 'Pay multiplier for holiday work', 'number'),
('overtime_pay_multiplier', '1.5', 'Pay multiplier for overtime hours', 'number'),
('automatic_break_deduction_minutes', '60', 'Minutes automatically deducted for lunch break', 'number'),
('require_admin_approval_for_overtime', 'true', 'Whether overtime requires admin approval', 'boolean'),
('allow_retroactive_requests', 'true', 'Whether employees can submit requests for past dates', 'boolean'),
('max_retroactive_days', '7', 'Maximum days in the past for retroactive requests', 'number')
ON CONFLICT (setting_name) DO NOTHING;

-- Insert default work schedule
INSERT INTO work_schedules (name, start_time, end_time, days_of_week, is_default) VALUES
('Standard Business Hours', '09:00:00', '17:00:00', ARRAY[1,2,3,4,5], true)
ON CONFLICT DO NOTHING;

-- Insert some common holidays
INSERT INTO holidays (name, date, is_recurring, recurring_type, description) VALUES
('New Year''s Day', '2025-01-01', true, 'annual', 'New Year''s Day'),
('Independence Day', '2025-07-04', true, 'annual', 'Independence Day'),
('Christmas Day', '2025-12-25', true, 'annual', 'Christmas Day'),
('Thanksgiving', '2025-11-27', false, null, 'Thanksgiving 2025'),
('Black Friday', '2025-11-28', false, null, 'Black Friday 2025')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_attendance_settings_name ON attendance_settings(setting_name);
CREATE INDEX IF NOT EXISTS idx_work_schedules_default ON work_schedules(is_default);
