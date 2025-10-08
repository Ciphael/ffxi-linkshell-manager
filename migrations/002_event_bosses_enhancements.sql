-- Migration: Enhance event_bosses table
-- Purpose: Add quantity and ordering for multiple boss instances
-- Date: 2025-10-08

-- Add new columns to event_bosses if they don't exist
ALTER TABLE event_bosses
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS boss_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_event_bosses_order ON event_bosses(event_id, boss_order);

-- Update existing rows to have default values
UPDATE event_bosses
SET quantity = 1, boss_order = 0
WHERE quantity IS NULL OR boss_order IS NULL;

COMMENT ON COLUMN event_bosses.quantity IS 'Number of times this boss will be killed in the event';
COMMENT ON COLUMN event_bosses.boss_order IS 'Order in which bosses will be fought (0-indexed)';
COMMENT ON COLUMN event_bosses.completed_at IS 'Timestamp when the boss was marked as killed';
