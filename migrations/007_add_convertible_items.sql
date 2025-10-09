-- Migration: Add convertible items system for abjurations
-- Purpose: Track which items can be converted and what they convert to
-- Date: 2025-10-09

-- Add convertible column to item_classifications
ALTER TABLE item_classifications
ADD COLUMN IF NOT EXISTS convertible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS converts_to_item_id INTEGER,
ADD COLUMN IF NOT EXISTS converts_to_item_name VARCHAR(255);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_item_classifications_convertible ON item_classifications(convertible);
CREATE INDEX IF NOT EXISTS idx_item_classifications_converts_to ON item_classifications(converts_to_item_id);

-- Insert/Update all abjurations with their conversions
-- This uses a temporary table approach to handle all abjurations at once

WITH abjuration_mappings AS (
    SELECT
        'aquarian_abjuration_head' as abj_name, 'zenith_crown' as converts_name, 'Zenith Crown' as display_name
    UNION ALL SELECT 'aquarian_abjuration_body', 'dalmatica', 'Dalmatica'
    UNION ALL SELECT 'aquarian_abjuration_hands', 'zenith_mitts', 'Zenith Mitts'
    UNION ALL SELECT 'aquarian_abjuration_legs', 'zenith_slacks', 'Zenith Slacks'
    UNION ALL SELECT 'aquarian_abjuration_feet', 'zenith_pumps', 'Zenith Pumps'
    UNION ALL SELECT 'dryadic_abjuration_head', 'shura_zunari_kabuto', 'Shura Zunari Kabuto'
    UNION ALL SELECT 'dryadic_abjuration_body', 'shura_togi', 'Shura Togi'
    UNION ALL SELECT 'dryadic_abjuration_hands', 'shura_kote', 'Shura Kote'
    UNION ALL SELECT 'dryadic_abjuration_legs', 'shura_haidate', 'Shura Haidate'
    UNION ALL SELECT 'dryadic_abjuration_feet', 'shura_sune-ate', 'Shura Sune-Ate'
    UNION ALL SELECT 'earthen_abjuration_head', 'adaman_celata', 'Adaman Celata'
    UNION ALL SELECT 'earthen_abjuration_body', 'adaman_hauberk', 'Adaman Hauberk'
    UNION ALL SELECT 'earthen_abjuration_hands', 'adaman_mufflers', 'Adaman Mufflers'
    UNION ALL SELECT 'earthen_abjuration_legs', 'adaman_breeches', 'Adaman Breeches'
    UNION ALL SELECT 'earthen_abjuration_feet', 'adaman_sollerets', 'Adaman Sollerets'
    UNION ALL SELECT 'neptunal_abjuration_head', 'hecatomb_cap', 'Hecatomb Cap'
    UNION ALL SELECT 'neptunal_abjuration_body', 'hecatomb_harness', 'Hecatomb Harness'
    UNION ALL SELECT 'neptunal_abjuration_hands', 'hecatomb_mittens', 'Hecatomb Mittens'
    UNION ALL SELECT 'neptunal_abjuration_legs', 'hecatomb_subligar', 'Hecatomb Subligar'
    UNION ALL SELECT 'neptunal_abjuration_feet', 'hecatomb_leggings', 'Hecatomb Leggings'
    UNION ALL SELECT 'wyrmal_abjuration_head', 'crimson_mask', 'Crimson Mask'
    UNION ALL SELECT 'wyrmal_abjuration_body', 'crimson_scale_mail', 'Crimson Scale Mail'
    UNION ALL SELECT 'wyrmal_abjuration_hands', 'crimson_finger_gauntlets', 'Crimson Finger Gauntlets'
    UNION ALL SELECT 'wyrmal_abjuration_legs', 'crimson_cuisses', 'Crimson Cuisses'
    UNION ALL SELECT 'wyrmal_abjuration_feet', 'crimson_greaves', 'Crimson Greaves'
    UNION ALL SELECT 'martial_abjuration_head', 'koenig_schaller', 'Koenig Schaller'
    UNION ALL SELECT 'martial_abjuration_body', 'koenig_cuirass', 'Koenig Cuirass'
    UNION ALL SELECT 'martial_abjuration_hands', 'koenig_handschuhs', 'Koenig Handschuhs'
    UNION ALL SELECT 'martial_abjuration_legs', 'koenig_diechlings', 'Koenig Diechlings'
    UNION ALL SELECT 'martial_abjuration_feet', 'koenig_schuhs', 'Koenig Schuhs'
)
INSERT INTO item_classifications (item_id, item_name, classification, convertible, converts_to_item_id, converts_to_item_name, points_required, market_rate)
SELECT
    abj.itemid,
    am.abj_name,
    'Marketable',
    TRUE,
    conv.itemid,
    am.display_name,
    10,
    500000
FROM abjuration_mappings am
JOIN item_basic abj ON abj.name = am.abj_name
LEFT JOIN item_equipment conv ON conv.name = am.converts_name
ON CONFLICT (item_id) DO UPDATE SET
    convertible = TRUE,
    converts_to_item_id = EXCLUDED.converts_to_item_id,
    converts_to_item_name = EXCLUDED.converts_to_item_name;

COMMENT ON COLUMN item_classifications.convertible IS 'Whether this item can be converted to another item (e.g., abjurations)';
COMMENT ON COLUMN item_classifications.converts_to_item_id IS 'The item_id this item converts to';
COMMENT ON COLUMN item_classifications.converts_to_item_name IS 'Display name of the item this converts to';
