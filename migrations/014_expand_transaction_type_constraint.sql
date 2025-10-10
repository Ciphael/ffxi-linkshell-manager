-- Migration 014: Expand ls_bank_transactions transaction_type constraint
-- Add 'add' and 'remove' to allowed transaction types

-- Drop the old constraint
ALTER TABLE ls_bank_transactions
DROP CONSTRAINT IF EXISTS ls_bank_transactions_transaction_type_check;

-- Add new constraint with expanded values
ALTER TABLE ls_bank_transactions
ADD CONSTRAINT ls_bank_transactions_transaction_type_check
CHECK (transaction_type IN ('sale', 'purchase', 'add', 'remove'));
