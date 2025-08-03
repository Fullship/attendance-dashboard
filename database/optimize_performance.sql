-- Performance optimization indexes for faster upload processing
-- Run this script to optimize database performance for bulk uploads

-- Index on users table for faster lookups during upload processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_lower ON users (LOWER(first_name), LOWER(last_name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_admin_filter ON users (is_admin) WHERE is_admin = FALSE;

-- Composite index on attendance_records for faster upserts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_user_date ON attendance_records (user_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date_status ON attendance_records (date, status);

-- Index for file_uploads queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_status ON file_uploads (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_date_desc ON file_uploads (upload_date DESC);

-- Optimize statistics for better query planning
ANALYZE users;
ANALYZE attendance_records;
ANALYZE file_uploads;

-- Update PostgreSQL configuration recommendations (add to postgresql.conf):
-- 
-- # Memory settings for better bulk insert performance
-- shared_buffers = 256MB                    # Increase shared buffer
-- work_mem = 16MB                           # Increase work memory for sorting/hashing
-- maintenance_work_mem = 64MB               # Increase maintenance work memory
-- effective_cache_size = 1GB                # Set to ~75% of available RAM
-- 
-- # Connection settings
-- max_connections = 100                     # Adjust based on your needs
-- 
-- # WAL settings for better write performance
-- wal_buffers = 16MB                        # Increase WAL buffers
-- checkpoint_completion_target = 0.7        # Spread out checkpoint I/O
-- 
-- # Logging for performance monitoring
-- log_min_duration_statement = 1000         # Log slow queries (>1 second)
-- log_statement = 'mod'                     # Log data modification statements
