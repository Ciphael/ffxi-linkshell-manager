-- Migration 016: Standardize source values across LS Bank and Shop tables
-- Update all source values to use: 'Manual', 'Event Drop', 'Bank'

-- First, update existing data in ls_bank_transactions
UPDATE ls_bank_transactions
SET source = CASE
    WHEN source IN ('manual') THEN 'Manual'
    WHEN source IN ('event', 'boss_drop') THEN 'Event Drop'
    WHEN source IN ('ls_bank_item') THEN 'Bank'
    ELSE source
END
WHERE source IS NOT NULL;

-- Update existing data in ls_shop_inventory
UPDATE ls_shop_inventory
SET source = CASE
    WHEN source IN ('manual') THEN 'Manual'
    WHEN source IN ('event', 'boss_drop') THEN 'Event Drop'
    WHEN source IN ('ls_bank_item') THEN 'Bank'
    ELSE source
END
WHERE source IS NOT NULL;

-- Add CHECK constraint on ls_bank_transactions.source
ALTER TABLE ls_bank_transactions
ADD CONSTRAINT ls_bank_transactions_source_check
CHECK (source IN ('Manual', 'Event Drop', 'Bank'));

-- Add CHECK constraint on ls_shop_inventory.source
ALTER TABLE ls_shop_inventory
ADD CONSTRAINT ls_shop_inventory_source_check
CHECK (source IN ('Manual', 'Event Drop', 'Bank'));
