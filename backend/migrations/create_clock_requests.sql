-- Create clock_requests table for pending clock-in/clock-out requests
CREATE TABLE IF NOT EXISTS clock_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('clock_in', 'clock_out')),
    requested_time TIMESTAMP NOT NULL,
    requested_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique request per user per day per type
    UNIQUE(user_id, requested_date, request_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clock_requests_user_id ON clock_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_clock_requests_status ON clock_requests(status);
CREATE INDEX IF NOT EXISTS idx_clock_requests_date ON clock_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_clock_requests_admin ON clock_requests(admin_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clock_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clock_requests_updated_at
    BEFORE UPDATE ON clock_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_clock_requests_updated_at();
