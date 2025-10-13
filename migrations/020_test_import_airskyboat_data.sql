-- Migration 020 TEST: Import AirSkyBoat Data (Level 75 Era)
-- SIMPLIFIED TEST VERSION - No backups, just creates structures
-- For testing with sample data before full import

-- ==============================================================================
-- PHASE 1: DROP EXISTING TABLES IF ANY
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS item_equipment CASCADE;
DROP TABLE IF EXISTS item_weapon CASCADE;
DROP TABLE IF EXISTS item_basic CASCADE;
DROP TABLE IF EXISTS item_mods CASCADE;
DROP TABLE IF EXISTS weapon_skills CASCADE;

COMMIT;

-- ==============================================================================
-- PHASE 2: CREATE NEW TABLE STRUCTURES
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
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
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
-- COMPLETION NOTES
-- ==============================================================================

-- This is a TEST migration. After completion, import test data files:
-- 1. test-sql/test_001_item_basic.sql
-- 2. test-sql/test_002_item_equipment.sql
-- 3. test-sql/test_003_item_weapon.sql
-- 4. test-sql/test_004_weapon_skills.sql
-- 5. test-sql/test_005_item_mods.sql

COMMENT ON TABLE item_basic IS 'AirSkyBoat item data - TEST VERSION - level 75 era with rare/ex flags';
COMMENT ON TABLE item_equipment IS 'AirSkyBoat equipment data - TEST VERSION - filtered to level < 76';
COMMENT ON TABLE item_weapon IS 'AirSkyBoat weapon data - TEST VERSION - level 75 era';
COMMENT ON TABLE weapon_skills IS 'Weapon skill definitions for ADDS_WEAPONSKILL mods';
COMMENT ON TABLE item_mods IS 'Item stats and modifiers - TEST VERSION - filtered to imported items';
