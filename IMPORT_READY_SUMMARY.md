# AirSkyBoat Data Import - Ready for Execution

## ✅ Conversion Complete!

All AirSkyBoat data has been converted from MySQL to PostgreSQL format and is ready to import.

## Files Created

### Converted SQL Files (in `converted-sql/`)
1. **001_item_basic.sql** - 22,072 items with rare/ex flags parsed
2. **002_item_equipment.sql** - 7,378 equipment items (6,932 filtered out: level 76+)
3. **003_item_weapon.sql** - 4,795 weapons
4. **004_weapon_skills.sql** - 209 weapon skills (fixes "ADDS_WEAPONSKILL_DYN:+89" display)
5. **005_item_mods.sql** - 23,334 item mods (34,734 filtered out for removed items)

### Migration File
- **migrations/020_import_airskyboat_data.sql** - Main migration script

### Documentation
- **AIRSKYBOAT_DATA_VERIFICATION.md** - Field verification
- **MIGRATION_STRATEGY.md** - Detailed strategy
- **IMPORT_READY_SUMMARY.md** - This file

## What Was Done

### 1. Verified Data Consistency ✅
- Item IDs match between databases (Spharai: 18264, Mandau: 18270, etc.)
- No orphaned references found
- All 17,146 mob drops will continue to work
- All 259 item classifications preserved

### 2. Converted & Filtered ✅
- Removed all level 76+ items (6,932 items filtered out)
- Removed all ilevel items (era-inappropriate)
- Parsed rare/ex flags from bitwise flags:
  - Rare flag: 0x04 (4)
  - Ex flag: 0x40 (64)
- Converted MySQL → PostgreSQL data types
- Filtered item_mods to only imported items

### 3. Created Migration ✅
- Backs up existing tables (reversible)
- Creates new table structures
- Adds weapon_skills table (NEW!)
- Preserves item_classifications (custom data)
- Includes integrity verification

## Execution Plan

### Option A: Test on Sample First (Recommended)

```bash
# 1. Copy first 1000 lines of each file for testing
cd converted-sql
head -1010 001_item_basic.sql > test_item_basic.sql
head -1010 002_item_equipment.sql > test_item_equipment.sql
head -1010 003_item_weapon.sql > test_item_weapon.sql
head -210 004_weapon_skills.sql > test_weapon_skills.sql
head -5010 005_item_mods.sql > test_item_mods.sql

# 2. Create test database backup
# (via Railway dashboard or pg_dump)

# 3. Run migration on test data
node run-single-migration.js 020_import_airskyboat_data.sql
psql $DATABASE_URL -f converted-sql/test_item_basic.sql
psql $DATABASE_URL -f converted-sql/test_item_equipment.sql
# ... etc

# 4. Test queries, verify data, check frontend
# 5. If successful, proceed with full import
```

### Option B: Full Import (After Testing)

```bash
# 1. Run the migration (creates backups + new tables)
cd C:\users\roger\desktop\ffxi-linkshell-manager
node run-single-migration.js 020_import_airskyboat_data.sql

# 2. Import data (in order)
psql $DATABASE_URL -f converted-sql/001_item_basic.sql
# Takes ~30 seconds

psql $DATABASE_URL -f converted-sql/002_item_equipment.sql
# Takes ~10 seconds

psql $DATABASE_URL -f converted-sql/003_item_weapon.sql
# Takes ~5 seconds

psql $DATABASE_URL -f converted-sql/004_weapon_skills.sql
# Takes ~1 second

psql $DATABASE_URL -f converted-sql/005_item_mods.sql
# Takes ~20 seconds

# Total import time: ~1-2 minutes
```

## New Features After Import

### 1. Rare/Ex Display
Items now have `is_rare` and `is_ex` boolean columns:
```javascript
// Frontend can show badges
if (item.is_rare) {
    display += '<span class="rare-badge">RARE</span>';
}
if (item.is_ex) {
    display += '<span class="ex-badge">EX</span>';
}
```

### 2. Weapon Skill Names
Instead of cryptic "ADDS_WEAPONSKILL_DYN: +89", we can now show:
```javascript
// Query weapon_skills table
SELECT name FROM weapon_skills WHERE weaponskillid = 89;
// Returns: 'metatron_torment'

// Display: "In Dynamis: Metatron Torment"
```

### 3. Complete Stats
All item stats are now properly named and valued from item_mods table.

## Rollback Plan

If anything goes wrong:

```sql
-- Restore from backups
DROP TABLE item_equipment CASCADE;
DROP TABLE item_weapon CASCADE;
DROP TABLE item_basic CASCADE;
DROP TABLE item_mods CASCADE;
DROP TABLE weapon_skills CASCADE;

CREATE TABLE item_equipment AS SELECT * FROM item_equipment_backup;
CREATE TABLE item_weapon AS SELECT * FROM item_weapon_backup;
CREATE TABLE item_basic AS SELECT * FROM item_basic_backup;
CREATE TABLE item_mods AS SELECT * FROM item_mods_backup;

-- Recreate indexes
CREATE INDEX idx_item_equipment_itemid ON item_equipment(itemid);
-- etc.
```

## Verification Queries

After import, run these to verify:

```sql
-- Check item counts
SELECT 'item_basic', COUNT(*) FROM item_basic
UNION ALL
SELECT 'item_equipment', COUNT(*) FROM item_equipment
UNION ALL
SELECT 'item_weapon', COUNT(*) FROM item_weapon
UNION ALL
SELECT 'weapon_skills', COUNT(*) FROM weapon_skills
UNION ALL
SELECT 'item_mods', COUNT(*) FROM item_mods;

-- Expected results:
-- item_basic: 22,072
-- item_equipment: 7,378
-- item_weapon: 4,795
-- weapon_skills: 209
-- item_mods: 23,334

-- Check no orphaned references
SELECT COUNT(*) FROM mob_droplist md
WHERE md."itemId" NOT IN (SELECT itemid FROM item_basic);
-- Should return: 0

-- Check rare/ex items
SELECT COUNT(*) FROM item_basic WHERE is_rare = TRUE;
-- Should return: ~thousands

SELECT COUNT(*) FROM item_basic WHERE is_ex = TRUE;
-- Should return: ~thousands

-- Check weapon skill 89 (Metatron Torment)
SELECT * FROM weapon_skills WHERE weaponskillid = 89;
-- Should return: 'metatron_torment'

-- Check item with weapon skill mod
SELECT ie.name, ws.name as weapon_skill
FROM item_equipment ie
JOIN item_mods im ON ie."itemId" = im."itemId"
JOIN weapon_skills ws ON im.value = ws.weaponskillid
WHERE im."modId" IN (355, 356)
LIMIT 5;
```

## Frontend Updates Needed

After import, update frontend to display:

1. **Rare/Ex badges** in gear display
2. **Weapon skill names** instead of IDs
3. **Formatted stat names** (not raw mod names)
4. **Level requirements** prominently
5. **Job restrictions** clearly

## Summary

**What's Ready:**
- ✅ 22,072 items converted
- ✅ 7,378 equipment items (level 75 era)
- ✅ 4,795 weapons
- ✅ 209 weapon skills
- ✅ 23,334 item mods
- ✅ Rare/Ex flags parsed
- ✅ All item IDs consistent
- ✅ Full backups will be created
- ✅ Reversible migration

**What's Preserved:**
- ✅ All mob drop lists (17,146 entries)
- ✅ All item classifications (259 items)
- ✅ All event drops
- ✅ All shop inventory
- ✅ All wishlists

**Estimated Time:**
- Migration script: 10 seconds
- Data import: 1-2 minutes
- Verification: 1 minute
- **Total: 3-5 minutes**

## Ready to Proceed?

The data is ready. When you're ready to import:

1. Test on sample data first (recommended)
2. Run full migration
3. Verify with test queries
4. Update frontend
5. Enjoy complete item data with rare/ex and weapon skills!

Let me know when you're ready to proceed or if you need any clarification!
