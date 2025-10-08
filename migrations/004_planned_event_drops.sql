-- Migration: Planned event drops system
-- Purpose: Pre-configure drops before bosses are killed, track what actually drops
-- Date: 2025-10-08

-- Create planned event drops table
CREATE TABLE IF NOT EXISTS planned_event_drops (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_boss_id INTEGER NOT NULL REFERENCES event_bosses(id) ON DELETE CASCADE,
    item_id INTEGER,
    item_name VARCHAR(255) NOT NULL,
    drop_rate DECIMAL(5,2) DEFAULT 100.00,
    classification VARCHAR(20) DEFAULT 'Marketable',

    -- Pre-configuration (before drop)
    allocation_type VARCHAR(20) DEFAULT 'unassigned' CHECK (allocation_type IN ('unassigned', 'ls_member', 'external', 'ls_funds')),
    pre_assigned_to INTEGER REFERENCES users(id),
    expected_value INTEGER DEFAULT 0,

    -- Post-drop confirmation
    confirmed_dropped BOOLEAN DEFAULT FALSE,
    actual_dropped_at TIMESTAMP,

    -- Final allocation (after drop confirmed)
    won_by INTEGER REFERENCES users(id),
    winning_bid INTEGER DEFAULT 0,
    external_buyer VARCHAR(255),
    sell_value INTEGER,
    ls_fund_category VARCHAR(50),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_planned_drops_event ON planned_event_drops(event_id);
CREATE INDEX idx_planned_drops_boss ON planned_event_drops(event_boss_id);
CREATE INDEX idx_planned_drops_confirmed ON planned_event_drops(confirmed_dropped);
CREATE INDEX idx_planned_drops_classification ON planned_event_drops(classification);

-- Add trigger to automatically update ls_fund_transactions when external sales are recorded
CREATE OR REPLACE FUNCTION record_external_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.confirmed_dropped = TRUE
       AND NEW.external_buyer IS NOT NULL
       AND NEW.sell_value > 0
       AND (OLD.confirmed_dropped = FALSE OR OLD.external_buyer IS NULL) THEN

        -- Record transaction in ls_fund_transactions
        INSERT INTO ls_fund_transactions (
            fund_category,
            amount,
            transaction_type,
            source_type,
            event_id,
            item_id,
            item_name,
            buyer_name,
            description
        ) VALUES (
            'LS Sold Items',
            NEW.sell_value,
            'deposit',
            'external_sale',
            NEW.event_id,
            NEW.item_id,
            NEW.item_name,
            NEW.external_buyer,
            'External sale of ' || NEW.item_name || ' to ' || NEW.external_buyer
        );

        -- Update ls_funds balance
        UPDATE ls_funds
        SET amount = amount + NEW.sell_value,
            updated_at = CURRENT_TIMESTAMP
        WHERE category = 'LS Sold Items';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_external_sale
AFTER INSERT OR UPDATE ON planned_event_drops
FOR EACH ROW
EXECUTE FUNCTION record_external_sale();

COMMENT ON TABLE planned_event_drops IS 'Pre-configured and actual drops for event bosses with flexible allocation';
COMMENT ON COLUMN planned_event_drops.allocation_type IS 'unassigned: Not yet allocated, ls_member: Assigned to LS member, external: Sold externally, ls_funds: Goes directly to LS funds';
COMMENT ON COLUMN planned_event_drops.confirmed_dropped IS 'TRUE when raid leader confirms this item actually dropped';
