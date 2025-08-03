-- Role Management Schema for Admin Settings
-- This schema provides comprehensive role-based access control (RBAC)

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();IQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- e.g., 'users', 'attendance', 'reports'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- Create hierarchy_levels table
CREATE TABLE IF NOT EXISTS hierarchy_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    level INTEGER NOT NULL UNIQUE, -- 1 = highest level (CEO), increasing numbers = lower levels
    description TEXT,
    reporting_to_level INTEGER REFERENCES hierarchy_levels(level),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Create user_roles table to assign roles to users
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    hierarchy_level_id INTEGER REFERENCES hierarchy_levels(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Create system_settings table for configurable system parameters
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'security', 'attendance', 'notifications'
    is_public BOOLEAN DEFAULT false, -- whether setting can be read by non-admin users
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_levels_level ON hierarchy_levels(level);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('view_dashboard', 'View admin dashboard', 'dashboard', 'read'),
('manage_users', 'Create, update, and delete users', 'users', 'manage'),
('view_users', 'View user information', 'users', 'read'),
('manage_attendance', 'Manage attendance records and settings', 'attendance', 'manage'),
('view_attendance', 'View attendance records', 'attendance', 'read'),
('manage_reports', 'Generate and manage reports', 'reports', 'manage'),
('view_reports', 'View reports', 'reports', 'read'),
('manage_settings', 'Manage system settings', 'settings', 'manage'),
('view_settings', 'View system settings', 'settings', 'read'),
('manage_roles', 'Manage roles and permissions', 'roles', 'manage'),
('manage_hierarchy', 'Manage organizational hierarchy', 'hierarchy', 'manage'),
('approve_requests', 'Approve time-off and adjustment requests', 'requests', 'approve'),
('manage_locations', 'Manage office locations', 'locations', 'manage'),
('manage_teams', 'Manage teams and departments', 'teams', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Insert default hierarchy levels
INSERT INTO hierarchy_levels (name, level, description) VALUES
('Executive', 1, 'C-level executives and company owners'),
('Director', 2, 'Department directors and VPs'),
('Manager', 3, 'Team managers and supervisors'),
('Lead', 4, 'Team leads and senior staff'),
('Staff', 5, 'Regular employees and specialists'),
('Intern', 6, 'Interns and temporary staff')
ON CONFLICT (name) DO NOTHING;

-- Update hierarchy reporting relationships
UPDATE hierarchy_levels SET reporting_to_level = 1 WHERE level = 2; -- Directors report to Executives
UPDATE hierarchy_levels SET reporting_to_level = 2 WHERE level = 3; -- Managers report to Directors
UPDATE hierarchy_levels SET reporting_to_level = 3 WHERE level = 4; -- Leads report to Managers
UPDATE hierarchy_levels SET reporting_to_level = 4 WHERE level = 5; -- Staff report to Leads
UPDATE hierarchy_levels SET reporting_to_level = 5 WHERE level = 6; -- Interns report to Staff

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('Super Admin', 'Full system access with all permissions'),
('Admin', 'Administrative access with most permissions'),
('Manager', 'Management access for team oversight'),
('HR Specialist', 'Human resources focused permissions'),
('Employee', 'Basic employee access'),
('Viewer', 'Read-only access to relevant data')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Super Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Admin role (most permissions except some sensitive ones)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin'
AND p.name IN (
    'view_dashboard', 'manage_users', 'view_users', 'manage_attendance', 'view_attendance',
    'manage_reports', 'view_reports', 'view_settings', 'approve_requests',
    'manage_locations', 'manage_teams'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Manager'
AND p.name IN (
    'view_dashboard', 'view_users', 'view_attendance', 'view_reports',
    'approve_requests'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to HR Specialist role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR Specialist'
AND p.name IN (
    'view_dashboard', 'manage_users', 'view_users', 'manage_attendance', 'view_attendance',
    'view_reports', 'manage_locations', 'manage_teams'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Employee role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Employee'
AND p.name IN ('view_attendance')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Viewer'
AND p.name IN ('view_dashboard', 'view_users', 'view_attendance', 'view_reports')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
('company_name', 'Your Company Name', 'string', 'Name of the organization', 'general', true),
('max_daily_hours', '12', 'number', 'Maximum allowed working hours per day', 'attendance', false),
('overtime_threshold', '8', 'number', 'Hours after which overtime applies', 'attendance', false),
('session_timeout', '60', 'number', 'Session timeout in minutes', 'security', false),
('password_min_length', '8', 'number', 'Minimum password length', 'security', false),
('require_2fa', 'false', 'boolean', 'Require two-factor authentication', 'security', false),
('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications', false),
('auto_logout_warning', '5', 'number', 'Minutes before auto-logout warning', 'security', false),
('timezone_default', 'UTC', 'string', 'Default system timezone', 'general', true),
('date_format', 'YYYY-MM-DD', 'string', 'Default date format', 'general', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Create triggers to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hierarchy_levels_updated_at ON hierarchy_levels;
CREATE TRIGGER update_hierarchy_levels_updated_at BEFORE UPDATE ON hierarchy_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
