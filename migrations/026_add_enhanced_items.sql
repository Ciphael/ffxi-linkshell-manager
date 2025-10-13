-- Migration: Add enhanced item support for convertible items
-- Purpose: Track both base and enhanced (+1) versions of equipment from abjurations
-- Date: 2025-10-13

-- Add columns for enhanced item data
ALTER TABLE item_classifications
ADD COLUMN IF NOT EXISTS enhanced_item_id INTEGER,
ADD COLUMN IF NOT EXISTS enhanced_item_name VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_classifications_enhanced ON item_classifications(enhanced_item_id);

-- Populate enhanced item data based on known FFXI evolution patterns

-- Crimson -> Blood (Wyrmal Abjurations)
UPDATE item_classifications ic
SET enhanced_item_id = ib.itemid,
    enhanced_item_name =
        INITCAP(REPLACE(REPLACE(ib.name, '_', ' '), '+1', '+1'))
FROM item_basic ib
WHERE ic.convertible = TRUE
  AND ic.converts_to_item_name LIKE 'Crimson%'
  AND ib.name = REPLACE(LOWER(ic.converts_to_item_name), 'crimson', 'blood');

-- Standard +1 items (Zenith, Shura, Hecatomb, Dalmatica)
UPDATE item_classifications ic
SET enhanced_item_id = ib.itemid,
    enhanced_item_name =
        INITCAP(REPLACE(REPLACE(ib.name, '_', ' '), '+1', '+1'))
FROM item_basic ib
WHERE ic.convertible = TRUE
  AND ic.enhanced_item_id IS NULL  -- Don't overwrite Crimson->Blood mappings
  AND ib.name = LOWER(REPLACE(ic.converts_to_item_name, ' ', '_')) || '_+1';

-- Special cases where base and enhanced are the same (Adaman, Koenig - no enhancement exists)
-- Leave enhanced_item_id NULL for these

COMMENT ON COLUMN item_classifications.enhanced_item_id IS 'The item_id of the enhanced (+1) version';
COMMENT ON COLUMN item_classifications.enhanced_item_name IS 'Display name of the enhanced (+1) version';

-- Verify the mappings
DO $$
DECLARE
    total_convertible INTEGER;
    with_enhanced INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_convertible
    FROM item_classifications
    WHERE convertible = TRUE;

    SELECT COUNT(*) INTO with_enhanced
    FROM item_classifications
    WHERE convertible = TRUE
      AND enhanced_item_id IS NOT NULL;

    RAISE NOTICE 'Total convertible items: %', total_convertible;
    RAISE NOTICE 'Items with enhanced versions: %', with_enhanced;
    RAISE NOTICE 'Items without enhanced versions: %', (total_convertible - with_enhanced);
END $$;
