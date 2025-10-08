-- Migration: Add item classification system
-- Purpose: Categorize items as Marketable, Vendor Trash, Pop Items, or Money Items
-- Date: 2025-10-08

-- Create item_classifications table
CREATE TABLE IF NOT EXISTS item_classifications (
    item_id INTEGER PRIMARY KEY,
    item_name VARCHAR(255),
    classification VARCHAR(20) NOT NULL CHECK (classification IN ('Marketable', 'Vendor Trash', 'Pop Item', 'Money Item')),
    estimated_value INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_item_classifications_classification ON item_classifications(classification);
CREATE INDEX idx_item_classifications_item_name ON item_classifications(item_name);

-- Add some common FFXI item classifications as examples
-- (You'll need to populate this with your actual items)
INSERT INTO item_classifications (item_id, item_name, classification, estimated_value) VALUES
    -- Example Marketable items from Sky
    (1132, 'Neptunal Abjuration: Head', 'Marketable', 1000000),
    (1133, 'Neptunal Abjuration: Body', 'Marketable', 1500000),
    (1134, 'Neptunal Abjuration: Hands', 'Marketable', 800000),
    (1135, 'Neptunal Abjuration: Legs', 'Marketable', 1200000),
    (1136, 'Neptunal Abjuration: Feet', 'Marketable', 800000),

    -- Example Pop Items
    (1552, 'Seal of Genbu', 'Pop Item', 0),
    (1553, 'Seal of Seiryu', 'Pop Item', 0),
    (1554, 'Seal of Byakko', 'Pop Item', 0),
    (1555, 'Seal of Suzaku', 'Pop Item', 0),

    -- Example Money Items
    (1875, 'Ancient Beastcoin', 'Money Item', 5000),
    (1876, 'Gold Beastcoin', 'Money Item', 1000),

    -- Example Vendor Trash
    (4096, 'Beetle Jaw', 'Vendor Trash', 100)
ON CONFLICT (item_id) DO NOTHING;

COMMENT ON TABLE item_classifications IS 'Categorizes items for event drop management';
COMMENT ON COLUMN item_classifications.classification IS 'Marketable: Can be lotted/sold to players, Vendor Trash: Sell to NPC, Pop Item: Used for spawning, Money Item: Sold externally for LS funds';
