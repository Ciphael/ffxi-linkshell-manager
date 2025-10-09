-- Migration 011: Populate Pop Items from mob_droplist

-- Insert all unique items that are used to spawn NMs (pop items)
-- These are typically found in mob_droplist with specific item types
INSERT INTO item_classifications (item_id, item_name, classification)
SELECT DISTINCT
    md.itemId as item_id,
    COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
    'Pop Item' as classification
FROM mob_droplist md
LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
LEFT JOIN item_basic ib ON md.itemId = ib.itemid
WHERE
    -- Common pop item patterns in FFXI
    (
        LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%gem%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%orb%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%seal%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%key item%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%testimony%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%charm%'
        OR LOWER(COALESCE(ie.name, iw.name, ib.name, '')) LIKE '%cell%'
    )
    AND md.itemId IS NOT NULL
    AND COALESCE(ie.name, iw.name, ib.name, '') != ''
ON CONFLICT (item_id) DO UPDATE
SET classification = 'Pop Item'
WHERE item_classifications.classification != 'Marketable'
  AND item_classifications.classification != 'Money Item';
