-- Migration 030: Consolidate points system confirmation into users table
-- Move confirmation tracking from separate table to users table

-- Add column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_system_confirmed_at TIMESTAMP DEFAULT NULL;

-- Migrate existing confirmations from points_system_confirmation to users
UPDATE users u
SET points_system_confirmed_at = psc.confirmed_at
FROM points_system_confirmation psc
WHERE u.id = psc.user_id;

-- Drop the old table
DROP TABLE IF EXISTS points_system_confirmation;

-- Add index for performance (optional, but useful for querying confirmed users)
CREATE INDEX IF NOT EXISTS idx_users_points_confirmed ON users(points_system_confirmed_at);

-- Comment
COMMENT ON COLUMN users.points_system_confirmed_at IS 'Timestamp when user confirmed understanding of points system (NULL = not confirmed)';
