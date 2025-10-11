-- Migration 015: Update planned_event_drops allocation_type constraint
-- Add 'ls_bank' and 'ls_store' to allowed allocation types

-- Drop the old constraint
ALTER TABLE planned_event_drops
DROP CONSTRAINT IF EXISTS planned_event_drops_allocation_type_check;

-- Add new constraint with expanded values
ALTER TABLE planned_event_drops
ADD CONSTRAINT planned_event_drops_allocation_type_check
CHECK (allocation_type IN ('unassigned', 'ls_member', 'external', 'ls_funds', 'ls_bank', 'ls_store'));
