-- Fix table structure issues
-- This script addresses column naming inconsistencies and missing triggers

-- 1. Fix clock_requests table column names to match the migration
ALTER TABLE clock_requests 
RENAME COLUMN request_date TO requested_date;

ALTER TABLE clock_requests 
RENAME COLUMN admin_comment TO admin_notes;

-- 2. Create a generic function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Add updated_at triggers for all tables that have updated_at column

-- Users table trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Attendance records table trigger
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clock requests table trigger (recreate with correct function name)
DROP TRIGGER IF EXISTS update_clock_requests_updated_at ON clock_requests;
CREATE TRIGGER update_clock_requests_updated_at
    BEFORE UPDATE ON clock_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Update indexes to reflect the new column names
DROP INDEX IF EXISTS idx_clock_requests_date;
CREATE INDEX IF NOT EXISTS idx_clock_requests_requested_date ON clock_requests(requested_date);

-- 5. Update the unique constraint to use the new column name
ALTER TABLE clock_requests 
DROP CONSTRAINT IF EXISTS clock_requests_user_id_request_date_request_type_key;

ALTER TABLE clock_requests 
ADD CONSTRAINT clock_requests_user_id_requested_date_request_type_key 
UNIQUE (user_id, requested_date, request_type);

-- 6. Verify the changes
SELECT 'Tables structure verification:' as message;

-- Show all tables
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name IN ('users', 'attendance_records', 'file_uploads', 'clock_requests')
ORDER BY table_name, ordinal_position;

-- Show all triggers
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- Show all constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
