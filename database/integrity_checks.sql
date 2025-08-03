-- Additional database checks and optimizations
-- Run this script to verify database integrity and add missing optimizations

-- 1. Check for any orphaned records (should return 0)
SELECT 'Checking for orphaned attendance records:' as check_type;
SELECT COUNT(*) as orphaned_attendance_records 
FROM attendance_records ar 
LEFT JOIN users u ON ar.user_id = u.id 
WHERE u.id IS NULL;

SELECT 'Checking for orphaned file uploads:' as check_type;
SELECT COUNT(*) as orphaned_file_uploads 
FROM file_uploads fu 
LEFT JOIN users u ON fu.uploaded_by = u.id 
WHERE fu.uploaded_by IS NOT NULL AND u.id IS NULL;

-- 2. Check for invalid status values
SELECT 'Checking for invalid attendance status values:' as check_type;
SELECT DISTINCT status, COUNT(*) 
FROM attendance_records 
WHERE status NOT IN ('present', 'absent', 'late', 'early_leave')
GROUP BY status;

SELECT 'Checking for invalid file upload status values:' as check_type;
SELECT DISTINCT status, COUNT(*) 
FROM file_uploads 
WHERE status NOT IN ('processing', 'completed', 'failed')
GROUP BY status;

-- 3. Add missing check constraints for better data integrity
ALTER TABLE attendance_records 
ADD CONSTRAINT check_status_values 
CHECK (status IN ('present', 'absent', 'late', 'early_leave'));

ALTER TABLE file_uploads 
ADD CONSTRAINT check_upload_status_values 
CHECK (status IN ('processing', 'completed', 'failed', 'completed_with_errors'));

-- 4. Add constraint to ensure hours_worked is non-negative
ALTER TABLE attendance_records 
ADD CONSTRAINT check_hours_worked_non_negative 
CHECK (hours_worked >= 0);

-- 5. Add constraint to ensure clock_out is after clock_in
ALTER TABLE attendance_records 
ADD CONSTRAINT check_clock_times_logical 
CHECK (clock_in IS NULL OR clock_out IS NULL OR clock_out >= clock_in);

-- 6. Add constraint to ensure requested_time is reasonable (not too far in the future or past)
ALTER TABLE clock_requests 
ADD CONSTRAINT check_requested_time_reasonable 
CHECK (requested_time >= CURRENT_DATE - INTERVAL '1 year' AND requested_time <= CURRENT_DATE + INTERVAL '1 week');

-- 7. Ensure email format is valid (basic check)
ALTER TABLE users 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 8. Update database statistics for better query planning
ANALYZE users;
ANALYZE attendance_records;
ANALYZE file_uploads;
ANALYZE clock_requests;

SELECT 'Database integrity checks and optimizations completed successfully!' as result;
