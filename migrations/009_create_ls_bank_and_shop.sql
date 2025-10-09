-- Migration 009: Create LS Bank and LS Shop tables

-- LS Bank Transactions Table
-- Tracks all financial transactions (sales and purchases)
CREATE TABLE IF NOT EXISTS ls_bank_transactions (
    transaction_id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('sale', 'purchase')),
    item_id INTEGER REFERENCES item_basic(itemid),
    item_name VARCHAR(255),
    amount INTEGER NOT NULL, -- gil amount
    description TEXT,
    recorded_by INTEGER REFERENCES users(id),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_id INTEGER REFERENCES events(id), -- nullable, links to event if from event sale
    source VARCHAR(50) -- 'event', 'manual', 'shop_retrieval'
);

CREATE INDEX idx_ls_bank_type ON ls_bank_transactions(transaction_type);
CREATE INDEX idx_ls_bank_event ON ls_bank_transactions(event_id);
CREATE INDEX idx_ls_bank_recorded_at ON ls_bank_transactions(recorded_at DESC);

-- LS Shop Inventory Table
-- Stores items available in the LS shop
CREATE TABLE IF NOT EXISTS ls_shop_inventory (
    shop_item_id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES item_basic(itemid),
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_id INTEGER REFERENCES events(id), -- nullable, links to source event if applicable
    source VARCHAR(50) DEFAULT 'manual', -- 'event', 'manual', 'donated'
    notes TEXT
);

CREATE INDEX idx_ls_shop_item ON ls_shop_inventory(item_id);
CREATE INDEX idx_ls_shop_added_at ON ls_shop_inventory(added_at DESC);

-- LS Shop Transaction Log
-- Tracks when items are retrieved from the shop
CREATE TABLE IF NOT EXISTS ls_shop_transactions (
    shop_transaction_id SERIAL PRIMARY KEY,
    shop_item_id INTEGER REFERENCES ls_shop_inventory(shop_item_id),
    item_id INTEGER NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity_retrieved INTEGER NOT NULL,
    retrieved_by INTEGER REFERENCES users(id), -- admin who processed retrieval
    recipient_user_id INTEGER REFERENCES users(id), -- user receiving the item (nullable if external)
    recipient_name VARCHAR(255), -- name if not a registered user
    value_type VARCHAR(20) CHECK (value_type IN ('gil', 'points')),
    value_amount INTEGER NOT NULL,
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_ls_shop_trans_retrieved_at ON ls_shop_transactions(retrieved_at DESC);
CREATE INDEX idx_ls_shop_trans_recipient ON ls_shop_transactions(recipient_user_id);
