-- Fix for PostgreSQL role "attendance-dashboard" does not exist
-- This script creates the missing database role and grants proper permissions

-- Create the role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attendance-dashboard') THEN
        CREATE ROLE "attendance-dashboard" WITH LOGIN PASSWORD 'your-secure-password-here';
        RAISE NOTICE 'Role "attendance-dashboard" created successfully';
    ELSE
        RAISE NOTICE 'Role "attendance-dashboard" already exists';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE attendance_dashboard TO "attendance-dashboard";
GRANT USAGE ON SCHEMA public TO "attendance-dashboard";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "attendance-dashboard";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "attendance-dashboard";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "attendance-dashboard";

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "attendance-dashboard";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "attendance-dashboard";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "attendance-dashboard";

-- Also ensure attendance_user exists (fallback)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'attendance_user') THEN
        CREATE ROLE attendance_user WITH LOGIN PASSWORD 'nVp50Q8PefBbCqXNiLmOb45K0ZXCHv7EKEmTcr4GRDxT5gXoIBdLL7MYLx8PGP19';
        RAISE NOTICE 'Role "attendance_user" created successfully';
    ELSE
        RAISE NOTICE 'Role "attendance_user" already exists';
    END IF;
END
$$;

-- Grant permissions to attendance_user as well
GRANT CONNECT ON DATABASE attendance_dashboard TO attendance_user;
GRANT USAGE ON SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO attendance_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO attendance_user;

-- Grant permissions on future objects for attendance_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO attendance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO attendance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO attendance_user;

-- Display current roles for verification
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin 
FROM pg_roles 
WHERE rolname IN ('attendance-dashboard', 'attendance_user', 'postgres') 
ORDER BY rolname;
