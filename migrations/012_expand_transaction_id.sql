-- Migration 012: Expand transaction_id from VARCHAR(18) to VARCHAR(20)
-- Transaction ID format is now 20 characters: [A/R/B/S]YYYYMMDD[E/M][AA][BB]NNNNNN

-- Update planned_event_drops
ALTER TABLE planned_event_drops
ALTER COLUMN transaction_id TYPE VARCHAR(20);

-- Update point_transactions
ALTER TABLE point_transactions
ALTER COLUMN transaction_id TYPE VARCHAR(20);

-- Update ls_bank_transactions
ALTER TABLE ls_bank_transactions
ALTER COLUMN transaction_id TYPE VARCHAR(20);

-- Update ls_shop_inventory
ALTER TABLE ls_shop_inventory
ALTER COLUMN transaction_id TYPE VARCHAR(20);
