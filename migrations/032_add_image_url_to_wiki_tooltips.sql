-- Add image_url column to item_wiki_tooltips for storing item icon from wiki
ALTER TABLE item_wiki_tooltips ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

COMMENT ON COLUMN item_wiki_tooltips.image_url IS 'URL to item icon image from wiki Statistics section';
