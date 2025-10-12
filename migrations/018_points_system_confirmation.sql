-- Migration 018: Points System Confirmation Tracking
-- Tracks when users confirm they have read and understood the points system

-- Create points_system_confirmation table
CREATE TABLE IF NOT EXISTS points_system_confirmation (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one confirmation per user
    CONSTRAINT unique_user_confirmation UNIQUE (user_id)
);

-- Index for performance
CREATE INDEX idx_points_confirmation_user ON points_system_confirmation(user_id);

-- Comments
COMMENT ON TABLE points_system_confirmation IS 'Tracks which users have confirmed understanding of the points system';
COMMENT ON COLUMN points_system_confirmation.user_id IS 'Reference to the user who confirmed';
COMMENT ON COLUMN points_system_confirmation.confirmed_at IS 'Timestamp when the user confirmed';
