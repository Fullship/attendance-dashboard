-- Make team location optional to allow teams with members from different locations

-- Remove the NOT NULL constraint from location_id in teams table
-- Note: PostgreSQL doesn't have a direct way to check if a column is NOT NULL
-- We'll use this approach to make location_id optional

-- First, let's alter the teams table to make location_id optional
ALTER TABLE teams 
ALTER COLUMN location_id DROP NOT NULL;

-- Update the unique constraint to allow multiple teams with the same name but different locations
-- or teams with the same name and no location
DROP INDEX IF EXISTS teams_name_location_id_key;

-- Create a new unique constraint that allows NULL location_id
-- We need a partial unique index for this
CREATE UNIQUE INDEX teams_name_unique 
ON teams (name) 
WHERE location_id IS NULL;

CREATE UNIQUE INDEX teams_name_location_unique 
ON teams (name, location_id) 
WHERE location_id IS NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN teams.location_id IS 'Optional location reference - teams can have members from multiple locations';
