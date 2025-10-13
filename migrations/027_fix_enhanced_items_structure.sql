-- Migration: Fix enhanced items to follow FFXI +1/+2/+3 structure
-- Purpose: Replace complex converts_to logic with simple enhanced_X_id columns
-- Date: 2025-10-13

BEGIN;

-- Remove old columns
ALTER TABLE item_classifications
DROP COLUMN IF EXISTS convertible,
DROP COLUMN IF EXISTS converts_to_item_id,
DROP COLUMN IF EXISTS converts_to_item_name,
DROP COLUMN IF EXISTS enhanced_item_id,
DROP COLUMN IF EXISTS enhanced_item_name;

-- Add new enhanced item columns following FFXI logic
ALTER TABLE item_classifications
ADD COLUMN IF NOT EXISTS enhanced_1_id INTEGER,
ADD COLUMN IF NOT EXISTS enhanced_2_id INTEGER,
ADD COLUMN IF NOT EXISTS enhanced_3_id INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_classifications_enhanced_1 ON item_classifications(enhanced_1_id);
CREATE INDEX IF NOT EXISTS idx_item_classifications_enhanced_2 ON item_classifications(enhanced_2_id);
CREATE INDEX IF NOT EXISTS idx_item_classifications_enhanced_3 ON item_classifications(enhanced_3_id);

-- Populate enhanced items for abjurations
-- Crimson -> Blood (Wyrmal)
UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = 'blood_mask')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_mask');

UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = 'blood_scale_mail')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_scale_mail');

UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = 'blood_finger_gauntlets')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_finger_gauntlets');

UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = 'blood_cuisses')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_cuisses');

UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = 'blood_greaves')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_greaves');

-- Standard +1 items (Zenith, Shura, Hecatomb, Dalmatica)
UPDATE item_classifications ic
SET enhanced_1_id = (SELECT itemid FROM item_basic WHERE name = ib.name || '_+1')
FROM item_basic ib
WHERE ic.item_id = ib.itemid
  AND (ib.name LIKE 'zenith%'
    OR ib.name LIKE 'shura%'
    OR ib.name LIKE 'hecatomb%'
    OR ib.name = 'dalmatica')
  AND EXISTS(SELECT 1 FROM item_basic WHERE name = ib.name || '_+1');

COMMENT ON COLUMN item_classifications.enhanced_1_id IS 'Item ID of +1 enhanced version (e.g., Crimson -> Blood, Zenith -> Zenith +1)';
COMMENT ON COLUMN item_classifications.enhanced_2_id IS 'Item ID of +2 enhanced version (future use)';
COMMENT ON COLUMN item_classifications.enhanced_3_id IS 'Item ID of +3 enhanced version (future use)';

-- Verify
DO $$
DECLARE
    with_enhanced INTEGER;
BEGIN
    SELECT COUNT(*) INTO with_enhanced
    FROM item_classifications
    WHERE enhanced_1_id IS NOT NULL;

    RAISE NOTICE 'Items with +1 enhanced versions: %', with_enhanced;
END $$;

COMMIT;
