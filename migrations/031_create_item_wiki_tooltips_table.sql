-- Create item_wiki_tooltips table for storing wiki-scraped tooltip data
-- This table stores the exact tooltip lines and formatting from ffxiclopedia wiki
-- Used for displaying accurate, wiki-formatted tooltips in the frontend

CREATE TABLE IF NOT EXISTS item_wiki_tooltips (
    item_id INT PRIMARY KEY REFERENCES item_basic(itemid) ON DELETE CASCADE,
    tooltip_lines JSONB NOT NULL,           -- Array of formatted tooltip lines (exactly as shown on wiki)
    hidden_effects JSONB DEFAULT '[]'::jsonb, -- Array of hidden effects from wiki
    wiki_description TEXT,                  -- Full description text from wiki
    wiki_url VARCHAR(500),                  -- Source wiki URL for reference
    last_scraped TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When this data was last scraped
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_wiki_tooltips_item_id ON item_wiki_tooltips(item_id);

-- Index for tracking stale data
CREATE INDEX IF NOT EXISTS idx_item_wiki_tooltips_last_scraped ON item_wiki_tooltips(last_scraped);

-- Trigger to update updated_at on row changes
CREATE OR REPLACE FUNCTION update_item_wiki_tooltips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_item_wiki_tooltips_timestamp
BEFORE UPDATE ON item_wiki_tooltips
FOR EACH ROW
EXECUTE FUNCTION update_item_wiki_tooltips_updated_at();

COMMENT ON TABLE item_wiki_tooltips IS 'Stores wiki-scraped tooltip data for items. Tooltip lines are stored exactly as displayed on wiki for accurate rendering.';
COMMENT ON COLUMN item_wiki_tooltips.tooltip_lines IS 'Array of tooltip lines with exact wiki formatting (e.g., ["[Head]All Races", "DEF:35 HP+50 VIT+15 Water+50"])';
COMMENT ON COLUMN item_wiki_tooltips.hidden_effects IS 'Array of hidden effects listed on wiki (e.g., ["Dragon Affinity", "Movement Speed +12%"])';
COMMENT ON COLUMN item_wiki_tooltips.wiki_description IS 'Full item description from wiki page';
COMMENT ON COLUMN item_wiki_tooltips.wiki_url IS 'Source URL from ffxiclopedia.fandom.com';
