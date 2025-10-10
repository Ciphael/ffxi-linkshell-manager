-- Add transaction_id column to track related transactions
-- Format: EV[YYYYMMDD][BOSSNAME6][##] - Example: EV20251010BYAKKO01

-- Add to planned_event_drops (main drop tracking table)
ALTER TABLE planned_event_drops
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(18);

-- Add to point_transactions (tracks point deductions)
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(18);

-- Add to ls_bank_transactions (tracks external sales)
ALTER TABLE ls_bank_transactions
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(18);

-- Add to ls_shop_inventory (tracks donated items)
ALTER TABLE ls_shop_inventory
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(18);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_planned_drops_transaction_id ON planned_event_drops(transaction_id);
CREATE INDEX IF NOT EXISTS idx_point_trans_transaction_id ON point_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_trans_transaction_id ON ls_bank_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shop_inv_transaction_id ON ls_shop_inventory(transaction_id);
