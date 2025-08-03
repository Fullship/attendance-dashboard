-- Comprehensive Index Migration for Performance Optimization
-- This migration adds indexes for all WHERE and JOIN clauses found across the application
-- Run with CONCURRENTLY to avoid locking during production deployment

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Primary authentication and lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_admin 
ON users(is_admin);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_employee_id 
ON users(employee_id);

-- Password reset functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reset_token 
ON users(reset_token) WHERE reset_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reset_token_expires 
ON users(reset_token_expires) WHERE reset_token_expires IS NOT NULL;

-- Location and team relationships (already exist but ensuring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location_id 
ON users(location_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_team_id 
ON users(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_id 
ON users(role_id);

-- Composite index for admin filtering by location and team
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_admin_filters 
ON users(is_admin, location_id, team_id) WHERE is_admin = false;

-- Updated timestamp for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_updated_at 
ON users(updated_at);

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE INDEXES
-- ============================================================================

-- Most common lookup patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_date 
ON attendance_records(user_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date 
ON attendance_records(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_id 
ON attendance_records(user_id);

-- Status filtering for reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status 
ON attendance_records(status);

-- Date range queries (very common in admin reports)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date_range 
ON attendance_records(date DESC, user_id);

-- Composite index for user attendance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_date_status 
ON attendance_records(user_id, date, status);

-- Hours worked analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_hours_worked 
ON attendance_records(hours_worked) WHERE hours_worked IS NOT NULL;

-- Clock in/out time analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_clock_times 
ON attendance_records(clock_in, clock_out) WHERE clock_in IS NOT NULL;

-- Updated timestamp for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_updated_at 
ON attendance_records(updated_at);

-- ============================================================================
-- LEAVE_REQUESTS TABLE INDEXES
-- ============================================================================

-- User leave request lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_user_id 
ON leave_requests(user_id);

-- Status filtering (most common admin operation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_status 
ON leave_requests(status);

-- Leave type analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_leave_type 
ON leave_requests(leave_type);

-- Date range queries for leave conflicts and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_date_range 
ON leave_requests(start_date, end_date);

-- Admin review workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_reviewed_by 
ON leave_requests(reviewed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_reviewed_at 
ON leave_requests(reviewed_at) WHERE reviewed_at IS NOT NULL;

-- Composite index for admin filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_admin_filters 
ON leave_requests(status, leave_type, start_date DESC);

-- Year-based reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_year 
ON leave_requests(EXTRACT(YEAR FROM start_date));

-- Semi-annual tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_semi_annual 
ON leave_requests(semi_annual_period, leave_type) WHERE semi_annual_period IS NOT NULL;

-- Weekend leave tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_weekend_leave 
ON leave_requests(is_weekend_leave) WHERE is_weekend_leave = true;

-- Leave category analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_category 
ON leave_requests(leave_category);

-- Date overlap detection (critical for leave conflicts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_overlap_check 
ON leave_requests(user_id, status, start_date, end_date) 
WHERE status IN ('pending', 'approved');

-- Updated timestamp for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_updated_at 
ON leave_requests(updated_at);

-- Created timestamp for ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_created_at 
ON leave_requests(created_at DESC);

-- ============================================================================
-- SEMI_ANNUAL_LEAVE_TRACKING TABLE INDEXES
-- ============================================================================

-- Primary lookup pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semi_annual_tracking_user_period 
ON semi_annual_leave_tracking(user_id, semi_annual_period, year);

-- Analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semi_annual_tracking_period_year 
ON semi_annual_leave_tracking(semi_annual_period, year);

-- Vacation usage analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semi_annual_vacation_usage 
ON semi_annual_leave_tracking(vacation_days_used) WHERE vacation_days_used > 0;

-- Weekend leave usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semi_annual_weekend_usage 
ON semi_annual_leave_tracking(weekend_leaves_used) WHERE weekend_leaves_used > 0;

-- ============================================================================
-- FILE_UPLOADS TABLE INDEXES
-- ============================================================================

-- User file tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_uploaded_by 
ON file_uploads(uploaded_by);

-- Status filtering for admin dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_status 
ON file_uploads(status);

-- File type analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_file_type 
ON file_uploads(file_type);

-- Processing status for bulk operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_processing 
ON file_uploads(status, processed_at) WHERE processed_at IS NOT NULL;

-- Upload date for cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_uploaded_at 
ON file_uploads(uploaded_at DESC);

-- Error tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_errors 
ON file_uploads(error_count) WHERE error_count > 0;

-- ============================================================================
-- LOCATIONS TABLE INDEXES
-- ============================================================================

-- Name lookup for location selection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_name 
ON locations(name);

-- Active locations filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_active 
ON locations(is_active) WHERE is_active = true;

-- Timezone-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_timezone 
ON locations(timezone);

-- ============================================================================
-- TEAMS TABLE INDEXES
-- ============================================================================

-- Location relationship (already exists but ensuring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_location_id 
ON teams(location_id);

-- Manager relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_manager_id 
ON teams(manager_id);

-- Active teams filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_active 
ON teams(is_active) WHERE is_active = true;

-- Team name lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_name 
ON teams(name);

-- Composite for unique constraint support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_name_location 
ON teams(name, location_id);

-- ============================================================================
-- ROLES TABLE INDEXES
-- ============================================================================

-- Role name lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_name 
ON roles(name);

-- System role filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_system 
ON roles(is_system_role);

-- Permission analysis (JSONB indexing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_permissions 
ON roles USING GIN(permissions);

-- ============================================================================
-- PERMISSIONS TABLE INDEXES
-- ============================================================================

-- Category-based permission lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permissions_category 
ON permissions(category);

-- Permission name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permissions_name 
ON permissions(name);

-- ============================================================================
-- HIERARCHY_LEVELS TABLE INDEXES
-- ============================================================================

-- Level number ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hierarchy_level_number 
ON hierarchy_levels(level_number);

-- Level name lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hierarchy_levels_name 
ON hierarchy_levels(name);

-- Permissions analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hierarchy_permissions 
ON hierarchy_levels USING GIN(permissions);

-- Management hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hierarchy_can_manage 
ON hierarchy_levels USING GIN(can_manage);

-- ============================================================================
-- SYSTEM_SETTINGS TABLE INDEXES
-- ============================================================================

-- Category-based settings lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_category 
ON system_settings(category);

-- Data type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_data_type 
ON system_settings(data_type);

-- ============================================================================
-- ATTENDANCE_RULES TABLE INDEXES
-- ============================================================================

-- Rule type and target filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_rules_type_target 
ON attendance_rules(rule_type, target_id);

-- Rule key lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_rules_key 
ON attendance_rules(rule_key);

-- Active rules filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_rules_active 
ON attendance_rules(is_active) WHERE is_active = true;

-- ============================================================================
-- LOCATION_HOLIDAYS TABLE INDEXES
-- ============================================================================

-- Location and date lookup (already exists but ensuring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_holidays_location_date 
ON location_holidays(location_id, holiday_date);

-- Recurring holidays
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_holidays_recurring 
ON location_holidays(is_recurring) WHERE is_recurring = true;

-- Date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_holidays_date 
ON location_holidays(holiday_date);

-- ============================================================================
-- TEAM_SCHEDULES TABLE INDEXES
-- ============================================================================

-- Team and day lookup (already exists but ensuring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_schedules_team_day 
ON team_schedules(team_id, day_of_week);

-- Working day filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_schedules_working_day 
ON team_schedules(is_working_day, day_of_week) WHERE is_working_day = true;

-- ============================================================================
-- CLOCK_REQUESTS TABLE INDEXES
-- ============================================================================

-- User clock request tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_user_id 
ON clock_requests(user_id);

-- Status filtering for admin review
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_status 
ON clock_requests(status);

-- Request type analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_request_type 
ON clock_requests(request_type);

-- Date-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_request_date 
ON clock_requests(request_date);

-- Admin review workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_reviewed_by 
ON clock_requests(reviewed_by);

-- Created timestamp for ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clock_requests_created_at 
ON clock_requests(created_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Join between users and attendance for admin reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_attendance_join 
ON users(id, is_admin, location_id, team_id) WHERE is_admin = false;

-- Join between users and leave_requests for admin analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_leave_admin_join 
ON users(id, location_id, team_id, is_admin) WHERE is_admin = false;

-- Attendance records with user information for reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_with_user_info 
ON attendance_records(user_id, date, status, hours_worked);

-- Leave requests with employee information for admin view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_with_employee_info 
ON leave_requests(user_id, status, leave_type, start_date, created_at DESC);

-- Team leave capacity analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_leave_capacity 
ON leave_requests(status, start_date, end_date) WHERE status = 'approved';

-- File upload status tracking with user info
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_with_user 
ON file_uploads(uploaded_by, status, uploaded_at DESC);

-- ============================================================================
-- INDEXES FOR PAGINATION AND ORDERING
-- ============================================================================

-- Common ordering patterns found in queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_order 
ON users(first_name, last_name, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date_desc 
ON attendance_records(date DESC, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_priority_order 
ON leave_requests(
    CASE status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'rejected' THEN 3 
        WHEN 'cancelled' THEN 4 
    END,
    created_at DESC
);

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTER CONDITIONS
-- ============================================================================

-- Active users only (excluding admins for employee queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_employees 
ON users(id, first_name, last_name, email, location_id, team_id) 
WHERE is_admin = false;

-- Pending leave requests (high-priority admin queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_leave_requests 
ON leave_requests(user_id, leave_type, start_date, created_at DESC) 
WHERE status = 'pending';

-- Approved leave requests for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approved_leave_requests 
ON leave_requests(user_id, leave_type, start_date, total_days) 
WHERE status = 'approved';

-- Recent attendance records (last 3 months)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_attendance 
ON attendance_records(user_id, date DESC, status) 
WHERE date >= CURRENT_DATE - INTERVAL '3 months';

-- Error uploads for admin attention
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_file_uploads 
ON file_uploads(uploaded_by, uploaded_at DESC, error_details) 
WHERE status = 'error';

-- ============================================================================
-- INDEXES FOR ANALYTICS AND REPORTING
-- ============================================================================

-- Monthly attendance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_monthly_analytics 
ON attendance_records(EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), user_id, status);

-- Yearly leave analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_yearly_analytics 
ON leave_requests(EXTRACT(YEAR FROM start_date), leave_type, status, total_days);

-- Team performance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_performance_analytics 
ON attendance_records(user_id, date, hours_worked, status);

-- Location-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_analytics 
ON users(location_id, team_id, is_admin, id) WHERE is_admin = false;

-- ============================================================================
-- CLEANUP AND VALIDATION
-- ============================================================================

-- Remove any duplicate or redundant indexes (PostgreSQL will skip if they don't exist)
-- Note: PostgreSQL automatically skips creating indexes that already exist when using IF NOT EXISTS

-- Update table statistics to help query planner
ANALYZE users;
ANALYZE attendance_records;
ANALYZE leave_requests;
ANALYZE semi_annual_leave_tracking;
ANALYZE file_uploads;
ANALYZE locations;
ANALYZE teams;
ANALYZE roles;
ANALYZE permissions;
ANALYZE hierarchy_levels;
ANALYZE system_settings;
ANALYZE attendance_rules;
ANALYZE location_holidays;
ANALYZE team_schedules;
ANALYZE clock_requests;

-- ============================================================================
-- PERFORMANCE MONITORING SETUP
-- ============================================================================

-- Create a view to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_scan < 10 THEN 'Rarely used'
        WHEN idx_scan < 100 THEN 'Moderately used'
        ELSE 'Frequently used'
    END as usage_level
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Create a view to monitor table and index sizes
CREATE OR REPLACE VIEW table_index_sizes AS
SELECT 
    t.tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) as table_size,
    pg_size_pretty(pg_indexes_size(quote_ident(t.tablename)::regclass)) as indexes_size,
    COUNT(i.indexname) as index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, pg_total_relation_size(quote_ident(t.tablename)::regclass), pg_indexes_size(quote_ident(t.tablename)::regclass)
ORDER BY pg_total_relation_size(quote_ident(t.tablename)::regclass) DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive index migration completed successfully at %', NOW();
    RAISE NOTICE 'Run the following queries to monitor index performance:';
    RAISE NOTICE '1. SELECT * FROM index_usage_stats;';
    RAISE NOTICE '2. SELECT * FROM table_index_sizes;';
    RAISE NOTICE '3. EXPLAIN (ANALYZE, BUFFERS) your slow queries to verify index usage';
END $$;
