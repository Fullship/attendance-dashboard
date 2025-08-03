-- Role Management Schema
-- This script creates tables for role-based access control

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create hierarchy_levels table
CREATE TABLE IF NOT EXISTS hierarchy_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    level_number INTEGER NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    can_manage JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(200) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add role_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Add hierarchy_level_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hierarchy_level_id INTEGER REFERENCES hierarchy_levels(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_hierarchy_level_id ON users(hierarchy_level_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default permissions
INSERT INTO permissions (id, name, description, category) VALUES
-- User Management
('users.create', 'Create Users', 'Create new user accounts', 'User Management'),
('users.read', 'View Users', 'View user information', 'User Management'),
('users.update', 'Update Users', 'Edit user information', 'User Management'),
('users.delete', 'Delete Users', 'Delete user accounts', 'User Management'),

-- Team Management
('teams.create', 'Create Teams', 'Create new teams', 'Team Management'),
('teams.read', 'View Teams', 'View team information', 'Team Management'),
('teams.update', 'Update Teams', 'Edit team information', 'Team Management'),
('teams.delete', 'Delete Teams', 'Delete teams', 'Team Management'),
('teams.assign', 'Assign Team Members', 'Assign users to teams', 'Team Management'),

-- Location Management
('locations.create', 'Create Locations', 'Create new locations', 'Location Management'),
('locations.read', 'View Locations', 'View location information', 'Location Management'),
('locations.update', 'Update Locations', 'Edit location information', 'Location Management'),
('locations.delete', 'Delete Locations', 'Delete locations', 'Location Management'),

-- Attendance Management
('attendance.read', 'View Attendance', 'View attendance records', 'Attendance'),
('attendance.update', 'Update Attendance', 'Edit attendance records', 'Attendance'),
('attendance.delete', 'Delete Attendance', 'Delete attendance records', 'Attendance'),
('attendance.import', 'Import Attendance', 'Import attendance data', 'Attendance'),
('attendance.export', 'Export Attendance', 'Export attendance data', 'Attendance'),

-- Clock Management
('clock.approve', 'Approve Clock Requests', 'Approve/reject clock requests', 'Clock Management'),
('clock.override', 'Override Clock Times', 'Manually adjust clock times', 'Clock Management'),

-- Leave Management
('leave.approve', 'Approve Leave Requests', 'Approve/reject leave requests', 'Leave Management'),
('leave.view_all', 'View All Leave Requests', 'View leave requests from all employees', 'Leave Management'),

-- Reporting
('reports.view', 'View Reports', 'Access reporting dashboard', 'Reporting'),
('reports.export', 'Export Reports', 'Export report data', 'Reporting'),
('reports.advanced', 'Advanced Reporting', 'Access advanced reporting features', 'Reporting'),

-- System Administration
('system.settings', 'System Settings', 'Manage system configuration', 'System'),
('system.roles', 'Manage Roles', 'Create and manage user roles', 'System'),
('system.permissions', 'Manage Permissions', 'Manage user permissions', 'System'),
('system.backup', 'System Backup', 'Create and manage backups', 'System'),
('system.logs', 'View System Logs', 'Access system logs', 'System')
ON CONFLICT (id) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('Super Admin', 'Full system access with all permissions', 
 '["users.create","users.read","users.update","users.delete","teams.create","teams.read","teams.update","teams.delete","teams.assign","locations.create","locations.read","locations.update","locations.delete","attendance.read","attendance.update","attendance.delete","attendance.import","attendance.export","clock.approve","clock.override","leave.approve","leave.view_all","reports.view","reports.export","reports.advanced","system.settings","system.roles","system.permissions","system.backup","system.logs"]', 
 true),
('HR Manager', 'Human resources management capabilities',
 '["users.create","users.read","users.update","teams.read","teams.assign","attendance.read","attendance.update","leave.approve","leave.view_all","reports.view","reports.export"]',
 false),
('Team Manager', 'Team management and attendance oversight',
 '["users.read","teams.read","attendance.read","clock.approve","leave.approve","reports.view"]',
 false),
('Employee', 'Basic employee access',
 '["users.read","attendance.read"]',
 true)
ON CONFLICT (name) DO NOTHING;

-- Insert default hierarchy levels
INSERT INTO hierarchy_levels (name, level_number, description, permissions, can_manage) VALUES
('Executive', 1, 'C-level executives and senior leadership',
 '["users.create","users.read","users.update","users.delete","teams.create","teams.read","teams.update","teams.delete","teams.assign","locations.create","locations.read","locations.update","locations.delete","attendance.read","attendance.update","attendance.delete","attendance.import","attendance.export","clock.approve","clock.override","leave.approve","leave.view_all","reports.view","reports.export","reports.advanced","system.settings","system.roles","system.permissions","system.backup","system.logs"]',
 '["Senior Manager","Manager","Team Lead","Employee"]'),
('Senior Manager', 2, 'Senior management positions',
 '["users.read","users.update","teams.create","teams.read","teams.update","teams.assign","locations.read","attendance.read","attendance.update","clock.approve","leave.approve","reports.view","reports.export"]',
 '["Manager","Team Lead","Employee"]'),
('Manager', 3, 'Department and team managers',
 '["users.read","teams.read","teams.assign","attendance.read","clock.approve","leave.approve","reports.view"]',
 '["Team Lead","Employee"]'),
('Team Lead', 4, 'Team leaders and supervisors',
 '["users.read","teams.read","attendance.read","clock.approve","reports.view"]',
 '["Employee"]'),
('Employee', 5, 'Regular employees',
 '["users.read","attendance.read"]',
 '[]')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, data_type) VALUES
('organization.name', 'My Company', 'Organization name displayed in the system', 'General', 'string'),
('organization.timezone', 'UTC', 'Default system timezone', 'General', 'string'),
('attendance.auto_clock_out_hours', '12', 'Automatically clock out employees after this many hours', 'Attendance', 'number'),
('attendance.require_approval', 'true', 'Require manager approval for clock requests', 'Attendance', 'boolean'),
('security.password_min_length', '8', 'Minimum password length', 'Security', 'number'),
('security.session_timeout_minutes', '480', 'Session timeout in minutes', 'Security', 'number'),
('notifications.email_enabled', 'true', 'Enable email notifications', 'Notifications', 'boolean')
ON CONFLICT (key) DO NOTHING;

-- Create trigger function for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hierarchy_levels_updated_at ON hierarchy_levels;
CREATE TRIGGER update_hierarchy_levels_updated_at
    BEFORE UPDATE ON hierarchy_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
