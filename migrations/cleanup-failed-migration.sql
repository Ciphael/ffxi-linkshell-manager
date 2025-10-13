-- Cleanup script for failed migration 020
-- Drops backup tables, migration_custom_data, and partial new tables

-- Drop backup tables
DROP TABLE IF EXISTS item_equipment_backup CASCADE;
DROP TABLE IF EXISTS item_weapon_backup CASCADE;
DROP TABLE IF EXISTS item_basic_backup CASCADE;
DROP TABLE IF EXISTS item_mods_backup CASCADE;
DROP TABLE IF EXISTS migration_custom_data CASCADE;

-- Drop any partially created new tables
DROP TABLE IF EXISTS weapon_skills CASCADE;
DROP TABLE IF EXISTS item_basic CASCADE;
DROP TABLE IF EXISTS item_equipment CASCADE;
DROP TABLE IF EXISTS item_weapon CASCADE;
DROP TABLE IF EXISTS item_mods CASCADE;

-- NOTE: This cleanup removes ALL item tables.
-- After running this, you MUST run migration 020 and import data files.
