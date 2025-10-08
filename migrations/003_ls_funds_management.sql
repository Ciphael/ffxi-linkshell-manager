-- Migration: Linkshell funds management system
-- Purpose: Track LS funds from external sales and money items
-- Date: 2025-10-08

-- Create LS funds tracking table
CREATE TABLE IF NOT EXISTS ls_funds (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('LS Shop', 'LS Pop Sets', 'LS Sold Items')),
    amount BIGINT DEFAULT 0,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create LS fund transactions table for detailed history
CREATE TABLE IF NOT EXISTS ls_fund_transactions (
    id SERIAL PRIMARY KEY,
    fund_category VARCHAR(50) NOT NULL,
    amount BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
    source_type VARCHAR(30), -- 'external_sale', 'money_item', 'manual_adjustment'
    event_id INTEGER REFERENCES events(id),
    item_id INTEGER,
    item_name VARCHAR(255),
    buyer_name VARCHAR(255),
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize the three fund categories
INSERT INTO ls_funds (category, amount, description) VALUES
    ('LS Shop', 0, 'Funds allocated for LS shop purchases'),
    ('LS Pop Sets', 0, 'Funds for purchasing pop items and keys'),
    ('LS Sold Items', 0, 'Total gil from selling items externally')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_ls_fund_transactions_event ON ls_fund_transactions(event_id);
CREATE INDEX idx_ls_fund_transactions_category ON ls_fund_transactions(fund_category);
CREATE INDEX idx_ls_fund_transactions_created_at ON ls_fund_transactions(created_at DESC);

COMMENT ON TABLE ls_funds IS 'Tracks linkshell fund balances across different categories';
COMMENT ON TABLE ls_fund_transactions IS 'Detailed history of all LS fund movements';
COMMENT ON COLUMN ls_fund_transactions.source_type IS 'external_sale: Item sold to external buyer, money_item: Converted money item, manual_adjustment: Manual correction';
