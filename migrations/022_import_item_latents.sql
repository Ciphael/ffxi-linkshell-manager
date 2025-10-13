-- Migration 022: Import item_latents table (VS_ECOSYSTEM effects only)
-- This contains "Vs. X" latent effects like "Vs. beasts: Accuracy+7"

CREATE TABLE IF NOT EXISTS item_latents (
    "itemId" SMALLINT NOT NULL,
    "modId" SMALLINT NOT NULL,
    value SMALLINT NOT NULL DEFAULT 0,
    "latentId" SMALLINT NOT NULL,
    "latentParam" SMALLINT NOT NULL,
    PRIMARY KEY ("itemId", "modId", value, "latentId", "latentParam")
);

-- Insert only VS_ECOSYSTEM (latentId = 59) latent effects
-- These are "Vs. [type]" effects that appear on weapons

INSERT INTO item_latents VALUES (16686,165,7,59,3);    -- Arcanabane - Vs. arcana: Critical hit rate +7%
INSERT INTO item_latents VALUES (16792,25,7,59,19);    -- Goshisho's Scythe - Vs. undead: Accuracy+7
INSERT INTO item_latents VALUES (16912,165,5,59,17);   -- Kitsutsuki - Vs. plantoids: Critical hit rate +5%
INSERT INTO item_latents VALUES (16968,165,7,59,3);    -- Kamewari - Vs. arcana: Critical hit rate +7%
INSERT INTO item_latents VALUES (16969,165,5,59,9);    -- Onikiri - Vs. demons: Critical hit rate +5%
INSERT INTO item_latents VALUES (17208,26,10,59,12);   -- Hamayumi - Vs. Empty: Ranged Accuracy+10
INSERT INTO item_latents VALUES (17208,66,10,59,12);   -- Hamayumi - Vs. Empty: Ranged Attack+10%
INSERT INTO item_latents VALUES (17759,165,7,59,20);   -- Koggelmander - Vs. vermin: Critical hit rate +7%
INSERT INTO item_latents VALUES (17804,25,7,59,6);     -- Ushikirimaru - Vs. beasts: Accuracy+7
INSERT INTO item_latents VALUES (17964,165,7,59,17);   -- Barkborer - Vs. plantoid: Critical hit rate +7%
INSERT INTO item_latents VALUES (18438,165,8,59,20);   -- Kumokirimaru - Vs. vermin: Critical hit rate +8%
INSERT INTO item_latents VALUES (18504,165,7,59,17);   -- Eventreuse - Vs. plantoid: Critical hit rate +7%
INSERT INTO item_latents VALUES (18767,25,3,59,8);     -- Birdbanes - Vs. birds: Accuracy+3
INSERT INTO item_latents VALUES (18865,165,7,59,20);   -- Zonure - Vs. vermin: Critical hit rate +7%
INSERT INTO item_latents VALUES (19113,165,7,59,14);   -- Ermine's Tail - Vs. lizards: Critical hit rate +7%
INSERT INTO item_latents VALUES (19158,165,7,59,14);   -- Scheherazade - Vs. lizards: Critical hit rate +7%
INSERT INTO item_latents VALUES (19273,165,7,59,6);    -- Onishibari - Vs. beasts: Critical hit rate +7%

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_item_latents_itemid ON item_latents("itemId");
CREATE INDEX IF NOT EXISTS idx_item_latents_latentid ON item_latents("latentId");
