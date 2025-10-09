-- Migration: Add Martial Abjuration items
-- Purpose: Add missing Martial Abjuration conversions to item_classifications
-- Date: 2025-10-09

-- Insert Martial Abjurations with their conversions
WITH martial_mappings AS (
    SELECT
        'martial_abjuration_head' as abj_name, 'koenig_schaller' as converts_name, 'Koenig Schaller' as display_name
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
FROM martial_mappings am
JOIN item_basic abj ON abj.name = am.abj_name
LEFT JOIN item_equipment conv ON conv.name = am.converts_name
ON CONFLICT (item_id) DO UPDATE SET
    convertible = TRUE,
    converts_to_item_id = EXCLUDED.converts_to_item_id,
    converts_to_item_name = EXCLUDED.converts_to_item_name;
