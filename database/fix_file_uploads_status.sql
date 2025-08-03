-- Fix file_uploads status field length
-- This script increases the status field size to accommodate longer status values

-- Check current structure
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'file_uploads' AND column_name = 'status';

-- Increase the status field length
ALTER TABLE file_uploads 
ALTER COLUMN status TYPE VARCHAR(50);

-- Verify the change
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'file_uploads' AND column_name = 'status';

-- Also check the attendance_records status field to make sure it's also correct
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'attendance_records' AND column_name = 'status';
