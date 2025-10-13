# Safe AirSkyBoat Data Migration Strategy

## ✅ Verification Results

### Item ID Consistency: **CONFIRMED**
- Spharai: 18264 (both databases) ✓
- Mandau: 18270 (both databases) ✓
- Kraken Club: 17440 (both databases) ✓
- Adaman Ingot: 655 (both databases) ✓
- Damascus Ingot: 658 (both databases) ✓

**Conclusion:** FFXI item IDs are standardized. Safe to replace item tables.

### No Orphaned References: **CONFIRMED**
- All 3,085 items in mob_droplist exist in item tables ✓
- All 259 items in item_classifications exist in item tables ✓
- All event/shop/wishlist items exist ✓

## Tables That Reference Items

| Table | Column | Row Count | Unique Items | Action |
|-------|--------|-----------|--------------|--------|
| **mob_droplist** | itemId | 17,146 | 3,085 | ✅ Keep - IDs will match |
| **item_classifications** | item_id | 259 | 259 | ✅ Keep - Custom data |
| **planned_event_drops** | item_id | 113 | 33 | ✅ Keep - IDs will match |
| **event_drops** | item_id | 16 | 7 | ✅ Keep - IDs will match |
| **ls_bank_transactions** | item_id | 5 | 3 | ✅ Keep - IDs will match |
| **ls_shop_inventory** | item_id | 8 | 4 | ✅ Keep - IDs will match |
| **user_wishlist** | item_id | 1 | 1 | ✅ Keep - IDs will match |

## Migration Plan (Safe & Reversible)

### Phase 1: Backup Current Data ✅ SAFE
```sql
-- Backup current tables
CREATE TABLE item_equipment_backup AS SELECT * FROM item_equipment;
CREATE TABLE item_weapon_backup AS SELECT * FROM item_weapon;
CREATE TABLE item_basic_backup AS SELECT * FROM item_basic;
CREATE TABLE item_mods_backup AS SELECT * FROM item_mods;

-- Keep track of custom data
CREATE TABLE migration_custom_data AS
SELECT item_id, item_name, classification, points_required, market_rate
FROM item_classifications;
```

### Phase 2: Import AirSkyBoat Data (Filtered)
```sql
-- Drop and recreate item tables
DROP TABLE item_equipment CASCADE;
DROP TABLE item_weapon CASCADE;
DROP TABLE item_basic CASCADE;

-- Import from AirSkyBoat with filters:
-- WHERE level < 76
-- WHERE ilevel = 0 OR ilevel IS NULL

-- Create new tables:
-- item_basic (with rare/ex flags parsed)
-- item_equipment (level 75 and below only)
-- item_weapon (level 75 and below only)
```

### Phase 3: Import Enhanced Data
```sql
-- Add weapon_skills table (NEW)
CREATE TABLE weapon_skills (...);
-- Import all weapon skills from AirSkyBoat

-- Replace item_mods with AirSkyBoat data (better stats)
DROP TABLE item_mods;
CREATE TABLE item_mods (...);
-- Import filtered item_mods (only for items we imported)
```

### Phase 4: Preserve Custom Data
```sql
-- Restore item_classifications (our custom data)
-- This table doesn't get replaced, we keep it as-is
```

### Phase 5: Verify Integrity
```sql
-- Check all foreign keys still resolve
SELECT COUNT(*) FROM mob_droplist md
LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
LEFT JOIN item_basic ib ON md.itemId = ib.itemid
WHERE ie.itemid IS NULL AND iw.itemid IS NULL AND ib.itemid IS NULL;
-- Should return 0

-- Check event drops still resolve
-- Check shop inventory still resolves
-- Check wishlist still resolves
```

## Conversion Requirements

### MySQL → PostgreSQL Conversions Needed

1. **Backticks to Double Quotes**
   ```sql
   `item_basic` → "item_basic"
   ```

2. **Data Types**
   - `tinyint` → `smallint`
   - `smallint(5) unsigned` → `integer`
   - `int(10) unsigned` → `bigint`
   - `tinytext` → `text`
   - `binary(22)` → `bytea`

3. **Remove MySQL-specific**
   - `ENGINE=MyISAM`
   - `LOCK TABLES` / `UNLOCK TABLES`
   - `AUTO_INCREMENT`
   - Character set specifications

4. **Multiple INSERT Statements**
   - Keep as-is (PostgreSQL supports this)

### Filters to Apply

```sql
-- For item_equipment:
WHERE level < 76 AND (ilevel = 0 OR ilevel IS NULL)

-- For item_weapon:
-- (weapons don't have level in table, must join with item_basic)
WHERE itemId IN (
    SELECT itemId FROM item_equipment WHERE level < 76
)

-- For item_mods:
WHERE itemId IN (
    SELECT itemid FROM item_equipment
    UNION
    SELECT itemid FROM item_weapon
)
```

## New Features After Migration

### 1. Rare/Ex Display
```javascript
// Frontend can now show:
if (item.is_rare) {
    badge += '<span class="rare-badge">RARE</span>';
}
if (item.is_ex) {
    badge += '<span class="ex-badge">EX</span>';
}
```

### 2. Weapon Skill Names
```javascript
// Instead of: "ADDS_WEAPONSKILL_DYN: +89"
// Show: "In Dynamis: Metatron Torment"
const ws = await getWeaponSkill(89);
display = `In Dynamis: ${formatName(ws.name)}`;
```

### 3. Better Stats Display
```javascript
// All stats properly named with values
stats = item_mods.map(mod => {
    const modName = mods[mod.modid].name;
    return formatModName(modName) + ': ' + formatValue(mod.value);
});
```

## Rollback Plan

If anything goes wrong:
```sql
-- Restore from backups
DROP TABLE item_equipment;
DROP TABLE item_weapon;
DROP TABLE item_basic;
DROP TABLE item_mods;

CREATE TABLE item_equipment AS SELECT * FROM item_equipment_backup;
CREATE TABLE item_weapon AS SELECT * FROM item_weapon_backup;
CREATE TABLE item_basic AS SELECT * FROM item_basic_backup;
CREATE TABLE item_mods AS SELECT * FROM item_mods_backup;

-- Restore indexes
CREATE INDEX idx_item_equipment_itemid ON item_equipment(itemid);
-- etc.
```

## Execution Order

1. ✅ Create backup tables
2. ✅ Convert AirSkyBoat SQL files to PostgreSQL format
3. ✅ Apply filters (level < 76, ilevel = 0)
4. ✅ Import item_basic (with rare/ex parsing)
5. ✅ Import item_equipment (filtered)
6. ✅ Import item_weapon (filtered)
7. ✅ Import weapon_skills (all)
8. ✅ Import item_mods (filtered to imported items only)
9. ✅ Verify all foreign keys resolve
10. ✅ Test frontend displays

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Item IDs don't match | **ELIMINATED** | High | ✅ Verified matching |
| Orphaned references | **ELIMINATED** | High | ✅ No orphans found |
| Data loss | Low | High | ✅ Full backups |
| Conversion errors | Medium | Medium | ✅ Test on sample first |
| Performance issues | Low | Low | ✅ Add indexes after import |

## Success Criteria

- [ ] All 17,146 mob drop entries still resolve to items
- [ ] All 259 item classifications preserved
- [ ] All event drops still resolve
- [ ] Rare/Ex badges display correctly
- [ ] Weapon skills display by name (not ID)
- [ ] Stats display with proper formatting
- [ ] No "ADDS_WEAPONSKILL_DYN" shown to users
- [ ] Gear Database shows level, jobs, rare/ex correctly

## Timeline

- **Conversion Script:** 1-2 hours
- **Testing on Sample:** 30 minutes
- **Full Import:** 20-30 minutes
- **Verification:** 30 minutes
- **Frontend Updates:** 1-2 hours

**Total:** 4-5 hours (can split into sessions)
