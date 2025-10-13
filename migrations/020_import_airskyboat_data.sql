-- Migration 020: Import AirSkyBoat Data (Level 75 Era)
-- Replaces item tables with complete AirSkyBoat data
-- Preserves all foreign key references (item IDs are consistent)
-- Adds: rare/ex flags, weapon skills, complete stats

-- ==============================================================================
-- PHASE 1: BACKUP EXISTING DATA
-- ==============================================================================

BEGIN;

-- Backup existing item tables
CREATE TABLE item_equipment_backup AS SELECT * FROM item_equipment;
CREATE TABLE item_weapon_backup AS SELECT * FROM item_weapon;
CREATE TABLE item_basic_backup AS SELECT * FROM item_basic;
CREATE TABLE item_mods_backup AS SELECT * FROM item_mods;

-- Save custom data that we want to preserve
CREATE TABLE migration_custom_data AS
SELECT item_id, item_name, classification, points_required, market_rate,
       estimated_value, convertible, converts_to_item_id, converts_to_item_name
FROM item_classifications;

COMMIT;

-- ==============================================================================
-- PHASE 2: DROP OLD TABLES (references will be recreated)
-- ==============================================================================

BEGIN;

-- Drop old item tables
DROP TABLE IF EXISTS item_equipment CASCADE;
DROP TABLE IF EXISTS item_weapon CASCADE;
DROP TABLE IF EXISTS item_basic CASCADE;
DROP TABLE IF EXISTS item_mods CASCADE;

COMMIT;

-- ==============================================================================
-- PHASE 3: CREATE NEW TABLE STRUCTURES
-- ==============================================================================

BEGIN;

-- Create item_basic with rare/ex columns
CREATE TABLE item_basic (
    itemid INTEGER PRIMARY KEY,
    subid INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    sortname TEXT NOT NULL,
    "stackSize" SMALLINT NOT NULL DEFAULT 1,
    flags INTEGER NOT NULL DEFAULT 0,
    "aH" SMALLINT NOT NULL DEFAULT 99,
    "NoSale" SMALLINT NOT NULL DEFAULT 0,
    "BaseSell" BIGINT NOT NULL DEFAULT 0,
    is_rare BOOLEAN DEFAULT FALSE,
    is_ex BOOLEAN DEFAULT FALSE
);

-- Create item_equipment (level 75 and below only)
CREATE TABLE item_equipment (
    "itemId" INTEGER PRIMARY KEY,
    name TEXT,
    level SMALLINT NOT NULL DEFAULT 0,
    ilevel SMALLINT NOT NULL DEFAULT 0,
    jobs BIGINT NOT NULL DEFAULT 0,
    "MId" INTEGER NOT NULL DEFAULT 0,
    "shieldSize" SMALLINT NOT NULL DEFAULT 0,
    "scriptType" INTEGER NOT NULL DEFAULT 0,
    slot INTEGER NOT NULL DEFAULT 0,
    rslot INTEGER NOT NULL DEFAULT 0,
    su_level SMALLINT NOT NULL DEFAULT 0,
    race SMALLINT NOT NULL DEFAULT 255
);

-- Create item_weapon
CREATE TABLE item_weapon (
    "itemId" INTEGER PRIMARY KEY,
    name TEXT,
    skill SMALLINT NOT NULL DEFAULT 0,
    subskill SMALLINT NOT NULL DEFAULT 0,
    ilvl_skill INTEGER NOT NULL DEFAULT 0,
    ilvl_parry INTEGER NOT NULL DEFAULT 0,
    ilvl_macc INTEGER NOT NULL DEFAULT 0,
    "dmgType" BIGINT NOT NULL DEFAULT 0,
    hit SMALLINT NOT NULL DEFAULT 1,
    delay INTEGER NOT NULL DEFAULT 0,
    dmg BIGINT NOT NULL DEFAULT 0,
    unlock_points INTEGER NOT NULL DEFAULT 0
);

-- Create weapon_skills (NEW TABLE - fixes ADDS_WEAPONSKILL display)
CREATE TABLE weapon_skills (
    weaponskillid SMALLINT PRIMARY KEY,
    name TEXT NOT NULL,
    jobs BYTEA NOT NULL,
    type SMALLINT NOT NULL DEFAULT 0,
    skilllevel INTEGER NOT NULL DEFAULT 0,
    element SMALLINT NOT NULL DEFAULT 0,
    animation SMALLINT NOT NULL DEFAULT 0,
    "animationTime" INTEGER NOT NULL DEFAULT 0,
    range SMALLINT NOT NULL DEFAULT 5,
    aoe SMALLINT NOT NULL DEFAULT 0,
    primary_sc SMALLINT NOT NULL DEFAULT 0,
    secondary_sc SMALLINT NOT NULL DEFAULT 0,
    tertiary_sc SMALLINT NOT NULL DEFAULT 0,
    main_only SMALLINT NOT NULL DEFAULT 0,
    unlock_id SMALLINT NOT NULL DEFAULT 0
);

-- Create item_mods (filtered to level 75 items)
CREATE TABLE item_mods (
    "itemId" INTEGER NOT NULL,
    "modId" SMALLINT NOT NULL,
    value SMALLINT NOT NULL,
    PRIMARY KEY ("itemId", "modId")
);

COMMIT;

-- ==============================================================================
-- PHASE 4: DATA WILL BE IMPORTED FROM CONVERTED SQL FILES
-- (Run the following files in order after this migration completes)
-- ==============================================================================

-- To complete the import, run these files:
-- 1. converted-sql/001_item_basic.sql (22,072 items)
-- 2. converted-sql/002_item_equipment.sql (7,378 items, filtered)
-- 3. converted-sql/003_item_weapon.sql (4,795 weapons)
-- 4. converted-sql/004_weapon_skills.sql (209 weapon skills)
-- 5. converted-sql/005_item_mods.sql (23,334 mods, filtered)

-- ==============================================================================
-- PHASE 5: CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

BEGIN;

-- Indexes for item tables
CREATE INDEX idx_item_basic_name ON item_basic(name);
CREATE INDEX idx_item_basic_rare_ex ON item_basic(is_rare, is_ex);

CREATE INDEX idx_item_equipment_level ON item_equipment(level);
CREATE INDEX idx_item_equipment_jobs ON item_equipment(jobs);
CREATE INDEX idx_item_equipment_slot ON item_equipment(slot);
CREATE INDEX idx_item_equipment_name ON item_equipment(name);

CREATE INDEX idx_item_weapon_skill ON item_weapon(skill);
CREATE INDEX idx_item_weapon_dmg ON item_weapon(dmg);
CREATE INDEX idx_item_weapon_name ON item_weapon(name);

CREATE INDEX idx_item_mods_itemid ON item_mods("itemId");
CREATE INDEX idx_item_mods_modid ON item_mods("modId");

CREATE INDEX idx_weapon_skills_name ON weapon_skills(name);

COMMIT;

-- ==============================================================================
-- PHASE 6: VERIFY FOREIGN KEY INTEGRITY
-- ==============================================================================

-- NOTE: Verification is commented out because it should run AFTER data import
-- Run verify-airskyboat-import.js after importing all data files

-- -- Check that all mob_droplist items still resolve
-- DO $$
-- DECLARE
--     orphan_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO orphan_count
--     FROM mob_droplist md
--     WHERE md.itemid IS NOT NULL
--     AND md.itemid NOT IN (
--         SELECT itemid FROM item_basic
--     );
--
--     IF orphan_count > 0 THEN
--         RAISE EXCEPTION 'Migration validation failed: % orphaned items in mob_droplist', orphan_count;
--     END IF;
--
--     RAISE NOTICE 'Verification passed: All mob_droplist items resolved';
-- END $$;
--
-- -- Check that all item_classifications items still resolve
-- DO $$
-- DECLARE
--     orphan_count INTEGER;
-- BEGIN
--     SELECT COUNT(*) INTO orphan_count
--     FROM item_classifications
--     WHERE item_id NOT IN (
--         SELECT itemid FROM item_basic
--     );
--
--     IF orphan_count > 0 THEN
--         RAISE NOTICE 'Warning: % items in item_classifications not found in item_basic', orphan_count;
--     ELSE
--         RAISE NOTICE 'Verification passed: All item_classifications resolved';
--     END IF;
-- END $$;

-- ==============================================================================
-- PHASE 7: RESTORE CUSTOM DATA (OPTIONAL - already preserved)
-- ==============================================================================

-- item_classifications table is NOT replaced - it contains your custom data
-- and will continue to work with the new item tables

-- ==============================================================================
-- COMPLETION NOTES
-- ==============================================================================

-- This migration creates the table structures and backups.
-- Data import is done separately by running the converted SQL files.

-- If you need to rollback:
-- DROP TABLE item_equipment, item_weapon, item_basic, item_mods, weapon_skills;
-- CREATE TABLE item_equipment AS SELECT * FROM item_equipment_backup;
-- CREATE TABLE item_weapon AS SELECT * FROM item_weapon_backup;
-- CREATE TABLE item_basic AS SELECT * FROM item_basic_backup;
-- CREATE TABLE item_mods AS SELECT * FROM item_mods_backup;

COMMENT ON TABLE item_basic IS 'AirSkyBoat item data - level 75 era with rare/ex flags';
COMMENT ON TABLE item_equipment IS 'AirSkyBoat equipment data - filtered to level < 76';
COMMENT ON TABLE item_weapon IS 'AirSkyBoat weapon data - level 75 era';
COMMENT ON TABLE weapon_skills IS 'Weapon skill definitions for ADDS_WEAPONSKILL mods';
COMMENT ON TABLE item_mods IS 'Item stats and modifiers - filtered to imported items';
