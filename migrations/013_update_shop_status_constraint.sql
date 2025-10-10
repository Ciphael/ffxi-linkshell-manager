-- Migration 013: Update ls_shop_inventory status constraint
-- Add 'Event Item', 'Pending Sale', and 'removed' to allowed values

-- Drop the old constraint
ALTER TABLE ls_shop_inventory
DROP CONSTRAINT IF EXISTS ls_shop_inventory_status_check;

-- Add new constraint with expanded values
ALTER TABLE ls_shop_inventory
ADD CONSTRAINT ls_shop_inventory_status_check
CHECK (status IN ('pending_sale', 'sold', 'in_use', 'Event Item', 'Pending Sale', 'removed'));
