-- Migration 019: Remove High Level Gear (76+)
-- Removes all equipment items with level requirement 76 or higher
-- These items don't exist in this version of the game (Era: level cap 75)

-- Store itemids to be deleted for cleanup
CREATE TEMP TABLE items_to_delete AS
SELECT itemid FROM item_equipment WHERE level >= 76;

-- Clean up item_mods entries for items being deleted
DELETE FROM item_mods
WHERE itemid IN (SELECT itemid FROM items_to_delete);

-- Clean up item_classifications entries for items being deleted
DELETE FROM item_classifications
WHERE item_id IN (SELECT itemid FROM items_to_delete);

-- Clean up any mob_droplist entries for items being deleted
DELETE FROM mob_droplist
WHERE itemId IN (SELECT itemid FROM items_to_delete);

-- Finally, delete the items from item_equipment
DELETE FROM item_equipment WHERE level >= 76;

-- Drop temp table
DROP TABLE items_to_delete;

-- Add comment
COMMENT ON TABLE item_equipment IS 'Equipment items - cleaned to remove level 76+ items (era-appropriate content)';
