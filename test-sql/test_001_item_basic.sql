-- Converted from AirSkyBoat MySQL to PostgreSQL
-- Source: item_basic.sql
-- Filters: "none"
-- Date: 2025-10-13T02:42:50.190Z

DROP TABLE IF EXISTS "item_basic";
CREATE TABLE "item_basic" (
"itemid" smallint(5) unsigned NOT NULL,
"subid" smallint(4) unsigned NOT NULL DEFAULT 0,
"name" tinytext NOT NULL,
"sortname" tinytext NOT NULL,
"stackSize" tinyint(2) unsigned NOT NULL DEFAULT 1,
"flags" smallint(5) unsigned NOT NULL DEFAULT 0,
"aH" tinyint(2) unsigned NOT NULL DEFAULT 99,
"NoSale" tinyint(1) unsigned NOT NULL DEFAULT 0,
"BaseSell" int(10) unsigned NOT NULL DEFAULT 0,
PRIMARY KEY ("itemid")
) ;
#############################################################################
# A Note regarding BaseSell values: When obtaining/updating Vendor buyback #
# prices, please be certain to use an NPC which ignores Fame as a factor #
# when buying items from the player. One such verified example is Challoux #
# in Port Jeuno (https://www.bg-wiki.com/ffxi/Challoux). This will ensure #
# that buyback prices are as accurate as possible. #
#############################################################################
*/;
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10250, 0, 'moogle_suit', 'moogle_suit', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10251, 0, 'decennial_coat', 'decennial_coat', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10252, 0, 'decennial_dress', 'decennial_dress', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10253, 0, 'decennial_coat_+1', 'decennial_coat_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10254, 0, 'decennial_dress_+1', 'decennial_dress_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10256, 0, 'marine_gilet', 'marine_gilet', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10257, 0, 'marine_top', 'marine_top', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10258, 0, 'woodsy_gilet', 'woodsy_gilet', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10259, 0, 'woodsy_top', 'woodsy_top', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10260, 0, 'creek_maillot', 'creek_maillot', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10261, 0, 'creek_top', 'creek_top', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10262, 0, 'river_top', 'river_top', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10263, 0, 'dune_gilet', 'dune_gilet', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10264, 0, 'marine_gilet_+1', 'marine_gilet_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10265, 0, 'marine_top_+1', 'marine_top_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10266, 0, 'woodsy_gilet_+1', 'woodsy_gilet_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10267, 0, 'woodsy_top_+1', 'woodsy_top_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10268, 0, 'creek_maillot_+1', 'creek_maillot_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10269, 0, 'creek_top_+1', 'creek_top_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10270, 0, 'river_top_+1', 'river_top_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10271, 0, 'dune_gilet_+1', 'dune_gilet_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10293, 0, 'chocobo_shirt', 'chocobo_shirt', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10330, 0, 'marine_boxers', 'marine_boxers', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10331, 0, 'marine_shorts', 'marine_shorts', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10332, 0, 'woodsy_boxers', 'woodsy_boxers', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10333, 0, 'woodsy_shorts', 'woodsy_shorts', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10334, 0, 'creek_boxers', 'creek_boxers', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10335, 0, 'creek_shorts', 'creek_shorts', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10336, 0, 'river_shorts', 'river_shorts', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10337, 0, 'dune_boxers', 'dune_boxers', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10338, 0, 'marine_boxers_+1', 'marine_boxers_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10339, 0, 'marine_shorts_+1', 'marine_shorts_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10340, 0, 'woodsy_boxers_+1', 'woodsy_boxers_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10341, 0, 'woodsy_shorts_+1', 'woodsy_shorts_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10342, 0, 'creek_boxers_+1', 'creek_boxers_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10343, 0, 'creek_shorts_+1', 'creek_shorts_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10344, 0, 'river_shorts_+1', 'river_shorts_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10345, 0, 'dune_boxers_+1', 'dune_boxers_+1', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10382, 0, 'dream_mittens', 'dream_mittens', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10383, 0, 'dream_mittens_+1', 'dream_mittens_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10384, 0, 'cumulus_masque', 'cumulus_masque', 1, 30784, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10385, 0, 'cumulus_masque_+1', 'cumulus_masque_+1', 1, 64584, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10429, 0, 'moogle_masque', 'moogle_masque', 1, 63568, 0, 0, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10430, 0, 'decennial_crown', 'decennial_crown', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10431, 0, 'decennial_tiara', 'decennial_tiara', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10432, 0, 'decennial_crown_+1', 'decennial_crown_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10433, 0, 'decennial_tiara_+1', 'decennial_tiara_+1', 1, 64600, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10446, 0, 'ahriman_cap', 'ahriman_cap', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10447, 0, 'pyracmon_cap', 'pyracmon_cap', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (10593, 0, 'decennial_tights', 'decennial_tights', 1, 63568, 0, 1, 0, false, true);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16385, 0, 'cesti', 'cesti', 1, 2084, 1, 0, 24, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16386, 0, 'lizard_cesti', 'lizard_cesti', 1, 2084, 1, 0, 302, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16387, 0, 'poison_cesti', 'poison_cesti', 1, 2084, 1, 0, 992, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16388, 0, 'himantes', 'himantes', 1, 2084, 1, 0, 1042, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16389, 0, 'coeurl_cesti', 'coeurl_cesti', 1, 2084, 1, 0, 2029, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16390, 0, 'bronze_knuckles', 'bronze_knuckles', 1, 2084, 1, 0, 61, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16391, 0, 'brass_knuckles', 'brass_knuckles', 1, 2084, 1, 0, 180, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16392, 0, 'metal_knuckles', 'metal_knuckles', 1, 2084, 1, 0, 873, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16393, 0, 'mythril_knuckles', 'mythril_knuckles', 1, 2084, 1, 0, 2296, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16394, 0, 'darksteel_knuckles', 'dst._knuckles', 1, 2084, 1, 0, 3212, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16395, 0, 'diamond_knuckles', 'diamond_knuckles', 1, 2084, 1, 0, 4223, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16396, 0, 'koenigs_knuckles', 'koenigs_knuckles', 1, 2084, 1, 0, 4461, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16397, 0, 'behemoth_cesti', 'behemoth_cesti', 1, 2084, 1, 0, 4163, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16398, 0, 'burning_cesti', 'burning_cesti', 1, 2080, 1, 0, 333, false, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16399, 0, 'katars', 'katars', 1, 2084, 1, 0, 1936, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16400, 0, 'darksteel_katars', 'darksteel_katars', 1, 2084, 1, 0, 3509, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16401, 0, 'jamadhars', 'jamadhars', 1, 2084, 1, 0, 3628, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16403, 0, 'poison_katars', 'poison_katars', 1, 2084, 1, 0, 2260, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16404, 0, 'venom_katars', 'venom_katars', 1, 2084, 1, 0, 3747, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16405, 0, 'cat_baghnakhs', 'cat_baghnakhs', 1, 2084, 1, 0, 29, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16406, 0, 'baghnakhs', 'baghnakhs', 1, 2084, 1, 0, 1440, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16407, 0, 'brass_baghnakhs', 'brass_baghnakhs', 1, 2084, 1, 0, 338, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16408, 0, 'rune_baghnakhs', 'rune_baghnakhs', 1, 2052, 1, 0, 12000, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16409, 0, 'lynx_baghnakhs', 'lynx_baghnakhs', 1, 2052, 1, 0, 1440, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16410, 0, 'poison_baghnakhs', 'psn._baghnakhs', 1, 2084, 1, 0, 2154, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16411, 0, 'claws', 'claws', 1, 2084, 1, 0, 1824, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16412, 0, 'mythril_claws', 'mythril_claws', 1, 2084, 1, 0, 3035, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16413, 0, 'darksteel_claws', 'darksteel_claws', 1, 2084, 1, 0, 3093, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16414, 0, 'cermet_claws', 'cermet_claws', 1, 2084, 1, 0, 5398, true, false);
INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (16416, 0, 'dragon_claws', 'dragon_claws', 1, 2084, 1, 0, 3908, true, false);