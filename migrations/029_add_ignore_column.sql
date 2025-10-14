-- Add IGNORE column to mark items that should never be considered
-- Applies to level 76+ gear and any other items we want to exclude

ALTER TABLE item_basic ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE;
ALTER TABLE item_equipment ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE;
ALTER TABLE item_weapon ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE;

-- Mark all level 76+ equipment as IGNORE
UPDATE item_equipment SET ignore = TRUE WHERE level > 75;
UPDATE item_weapon SET ignore = TRUE WHERE level > 75;

-- Mark corresponding entries in item_basic
UPDATE item_basic
SET ignore = TRUE
WHERE itemid IN (
    SELECT "itemId" FROM item_equipment WHERE level > 75
    UNION
    SELECT "itemId" FROM item_weapon WHERE level > 75
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_item_basic_ignore ON item_basic(ignore);
CREATE INDEX IF NOT EXISTS idx_item_equipment_ignore ON item_equipment(ignore);
CREATE INDEX IF NOT EXISTS idx_item_weapon_ignore ON item_weapon(ignore);
