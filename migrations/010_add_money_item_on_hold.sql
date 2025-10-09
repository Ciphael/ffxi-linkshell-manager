-- Migration 010: Add on_hold status for Money Items

-- Add status column to ls_bank_transactions
ALTER TABLE ls_bank_transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'on_hold'));

-- Add owner column for on-hold items
ALTER TABLE ls_bank_transactions
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);

-- Add boss_name for better source tracking
ALTER TABLE ls_bank_transactions
ADD COLUMN IF NOT EXISTS boss_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_ls_bank_status ON ls_bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ls_bank_owner ON ls_bank_transactions(owner_user_id);
