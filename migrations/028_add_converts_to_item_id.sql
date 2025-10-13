-- Migration: Add converts_to_item_id for abjuration items
-- Purpose: Track which standard item an abjuration converts to
-- Date: 2025-10-13

BEGIN;

-- Add converts_to_item_id column for abjurations
ALTER TABLE item_classifications
ADD COLUMN IF NOT EXISTS converts_to_item_id INTEGER;

-- Create index
CREATE INDEX IF NOT EXISTS idx_item_classifications_converts_to ON item_classifications(converts_to_item_id);

-- Populate Dryadic Abjurations -> Zenith gear
UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'zenith_crown')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'dryadic_abjuration:_head');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'zenith_mitts')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'dryadic_abjuration:_hands');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'zenith_slacks')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'dryadic_abjuration:_legs');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'zenith_pumps')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'dryadic_abjuration:_feet');

-- Populate Wyrmal Abjurations -> Crimson gear (standard versions)
UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_mask')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'wyrmal_abjuration:_head');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_scale_mail')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'wyrmal_abjuration:_body');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_finger_gauntlets')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'wyrmal_abjuration:_hands');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_cuisses')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'wyrmal_abjuration:_legs');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'crimson_greaves')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'wyrmal_abjuration:_feet');

-- Populate Martial Abjurations -> Shura gear
UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'shura_zunari_kabuto')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'martial_abjuration:_head');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'shura_togi')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'martial_abjuration:_body');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'shura_tekko')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'martial_abjuration:_hands');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'shura_haidate')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'martial_abjuration:_legs');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'shura_sune-ate')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'martial_abjuration:_feet');

-- Populate Neptunal Abjurations -> Hecatomb gear
UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'hecatomb_cap')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'neptunal_abjuration:_head');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'hecatomb_harness')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'neptunal_abjuration:_body');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'hecatomb_mittens')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'neptunal_abjuration:_hands');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'hecatomb_subligar')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'neptunal_abjuration:_legs');

UPDATE item_classifications ic
SET converts_to_item_id = (SELECT itemid FROM item_basic WHERE name = 'hecatomb_leggings')
WHERE item_id = (SELECT itemid FROM item_basic WHERE name = 'neptunal_abjuration:_feet');

COMMENT ON COLUMN item_classifications.converts_to_item_id IS 'For abjurations: item_id of the standard gear it creates (HQ versions derived from that item''s enhanced_X_id)';

-- Verify
DO $$
DECLARE
    with_conversion INTEGER;
BEGIN
    SELECT COUNT(*) INTO with_conversion
    FROM item_classifications
    WHERE converts_to_item_id IS NOT NULL;

    RAISE NOTICE 'Abjuration items with conversions: %', with_conversion;
END $$;

COMMIT;
