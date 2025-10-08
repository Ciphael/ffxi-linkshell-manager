-- Migration: Add points_required and market_rate to item_classifications
-- Purpose: Store default point requirements and market rates for marketable items
-- Date: 2025-10-08

-- Add new columns to item_classifications
ALTER TABLE item_classifications
ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS market_rate INTEGER DEFAULT 0;

-- Update existing Marketable items with example values (you can adjust these)
-- Sky items examples
UPDATE item_classifications SET points_required = 11, market_rate = 500000 WHERE item_name = 'Neptunal Abjuration: Head';
UPDATE item_classifications SET points_required = 15, market_rate = 800000 WHERE item_name = 'Neptunal Abjuration: Body';
UPDATE item_classifications SET points_required = 9, market_rate = 400000 WHERE item_name = 'Neptunal Abjuration: Hands';
UPDATE item_classifications SET points_required = 13, market_rate = 600000 WHERE item_name = 'Neptunal Abjuration: Legs';
UPDATE item_classifications SET points_required = 9, market_rate = 400000 WHERE item_name = 'Neptunal Abjuration: Feet';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_classifications_points ON item_classifications(points_required);
CREATE INDEX IF NOT EXISTS idx_item_classifications_market_rate ON item_classifications(market_rate);

COMMENT ON COLUMN item_classifications.points_required IS 'Default DKP points required to win this item from LS member';
COMMENT ON COLUMN item_classifications.market_rate IS 'Default market rate in gil when selling to external buyers';
