-- Migration 011: Add status and owner to ls_shop_inventory

-- Add status column to track sale status
ALTER TABLE ls_shop_inventory
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_sale' CHECK (status IN ('pending_sale', 'sold', 'in_use'));

-- Add owner column to track who is holding the item
ALTER TABLE ls_shop_inventory
ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id);

-- Add source_details for better tracking (e.g., "Event Name - Boss Name/Instance #")
ALTER TABLE ls_shop_inventory
ADD COLUMN IF NOT EXISTS source_details VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_ls_shop_status ON ls_shop_inventory(status);
CREATE INDEX IF NOT EXISTS idx_ls_shop_owner ON ls_shop_inventory(owner_user_id);
