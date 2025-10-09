-- Migration: Add committed column to planned_event_drops
-- Purpose: Track which drops are pre-configured vs actually confirmed/committed
-- Date: 2025-10-09

-- Add committed column to planned_event_drops
ALTER TABLE planned_event_drops
ADD COLUMN IF NOT EXISTS committed BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_planned_event_drops_committed ON planned_event_drops(committed);

-- Update existing confirmed drops to be committed
UPDATE planned_event_drops SET committed = TRUE WHERE confirmed_dropped = TRUE;

COMMENT ON COLUMN planned_event_drops.committed IS 'Whether this drop has been confirmed as actually dropped and allocated (Boss Killed). Pre-configurations are not committed.';
