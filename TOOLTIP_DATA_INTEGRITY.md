# Tooltip Data Integrity Documentation

**CRITICAL**: This document describes known data integrity issues that must be addressed for complete tooltip functionality. These issues represent gaps in the database that prevent full item information from being displayed.

## Overview

This application relies on accurate item data from the database to display tooltips. When conversation context is compacted or lost, it's critical to remember these ongoing data issues that affect user experience.

## Database Schema Reference

### Core Tables
- `item_basic` - Basic item info (itemid, name)
- `item_text` - Descriptions and display names (log_name, description)
- `item_mods` - Standard item modifications (modId, value)
- `item_latents` - Conditional effects (modId, value, latentId, latentParam)
- `item_equipment` - Equipment stats (slot, level, jobs, race)
- `item_weapon` - Weapon stats (dmg, delay, skill)
- `item_classifications` - Custom metadata (enhanced_1_id, enhanced_2_id, enhanced_3_id, converts_to_item_id)

## Known Data Issues

### 1. MISSING ITEM DESCRIPTIONS ⚠️ CRITICAL

**Status**: INCOMPLETE - Wiki scraping job did not finish or failed

**Affected Items**:
- Scarecrow Scythe (18044) - NO description
- Tonbo-Giri (16838) - NO description
- Seal of Byakko (1406) - NO description
- Spool of Malboro Fiber (837) - NO description
- Piece of Oxblood (1311) - NO description
- Crimson Cuisses (14280) - NO description
- ALL Abjurations (Aquarian, Earthen, Wyrmal, etc.) - NO or BAD descriptions

**Root Cause**:
The wiki scraping process (`scrape_wiki_descriptions.js`) appears to have stopped prematurely or encountered errors. The script targets https://ffxiclopedia.fandom.com/wiki/ but did not complete.

**Impact**:
Tooltips show no description text for these items, making it harder for users to understand what the item does.

**Solution Required**:
1. Re-run wiki scraping script with better error handling
2. Add logging to track progress
3. Implement resume capability for failed scrapes
4. Consider alternative wiki sources (bg-wiki.com) as backup

**Verification Query**:
```sql
SELECT COUNT(*) FROM item_text WHERE description IS NULL OR description = '';
```

---

### 2. MISSING LATENT EFFECTS ⚠️ MODERATE

**Status**: INCOMPLETE - Only 17 latents with latentId 59 exist, many weapons missing their data

**Affected Items**:
- Tonbo-Giri - MISSING "Vs. vermin: Critical hit rate +3%"
- Scarecrow Scythe - MISSING "Additional effect vs. birds: Bind"
- Many other creature-slayer weapons

**Root Cause**:
The database has latentId 59 (VS_ECOSYSTEM) entries for some items but not all. The source data (likely from LandSandBoat/Topaz) may be incomplete.

**Items with Latents** (for reference):
- arcanabane: Mod 165 (Crit) = 7 vs creature 3 (Arcana)
- goshishos_scythe: Mod 25 (Acc) = 7 vs creature 19 (Birds)
- kitsutsuki: Mod 165 (Crit) = 5 vs creature 17 (Plantoids)

**Impact**:
Users don't see important conditional bonuses that make weapons valuable against specific enemy types.

**Solution Required**:
1. Cross-reference with FFXI wiki for complete latent data
2. Manually populate missing latent entries
3. Create script to import latent data from wiki pages

**Verification Query**:
```sql
SELECT COUNT(*) FROM item_latents WHERE "latentId" = 59;
-- Currently: 17 (should be 50+)
```

---

### 3. MISSING ADDITIONAL EFFECTS ⚠️ MODERATE

**Status**: NOT IN DATABASE - No schema for additional effects vs creature types

**Affected Items**:
- Scarecrow Scythe - "Additional effect vs. birds: Bind"
- Other weapons with creature-specific additional effects

**Root Cause**:
The database schema doesn't have a column for additional effects that are conditional on creature type. The `item_basic` table has no `additionalEffect` column.

**Impact**:
Important weapon effects (bind, slow, paralyze vs specific creatures) are not displayed.

**Solution Required**:
1. Research if this data exists in source database
2. If yes: Import it properly
3. If no: May need to be manually added or use latent system differently

---

### 4. ENHANCED ITEM RELATIONSHIPS - NOW FIXED ✅

**Status**: FIXED (2025-01-13)

**Previously Affected**:
- Adaman → Armada (5 pieces) - MISSING
- Koenig → Kaiser (5 pieces) - MISSING
- Crimson → Blood (5 pieces) - MISSING

**Fix Applied**:
- Created `populate_adaman_koenig_enhanced.js` - populated Adaman→Armada and Koenig→Kaiser
- Created `populate_crimson_blood.js` - populated Crimson→Blood
- All 15 enhanced relationships now in `item_classifications.enhanced_1_id`

**Verification**:
```sql
SELECT ib.name, ib2.name as enhanced
FROM item_basic ib
JOIN item_classifications ic ON ib.itemid = ic.item_id
JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
WHERE ib.name ILIKE 'crimson%' OR ib.name ILIKE 'adaman%' OR ib.name ILIKE 'koenig%';
```

---

## Frontend MOD_NAMES Mapping

### Recently Added Mods
- **169**: Movement Speed (displays as percentage)
- **29, 384**: Haste (converts basis points to percentage)
- **288, 302**: Double/Triple Attack (now shows inline with weapon stats)

### Common Mods Reference
```javascript
const MOD_NAMES = {
    1: 'DEF', 2: 'HP', 3: 'HPP', 5: 'MP', 6: 'MPP',
    8: 'STR', 9: 'DEX', 10: 'VIT', 11: 'AGI', 12: 'INT', 13: 'MND', 14: 'CHR',
    23: 'Attack', 24: 'Ranged Attack', 25: 'Accuracy', 26: 'Ranged Accuracy',
    27: 'Enmity', 29: 'Haste', 30: 'Evasion', 31: 'Magic Evasion',
    73: 'Store TP', 165: 'Critical Hit Rate', 169: 'Movement Speed',
    288: 'Double Attack', 302: 'Triple Attack', 384: 'Haste'
};
```

If you see `Mod###` in a tooltip, that mod needs to be added to MOD_NAMES mapping in `app.js`.

---

## Tooltip Formatting Rules

### Display Priority
1. **Item name** (from item_basic.name, formatted)
2. **Slot/Weapon type** with **race** - ALWAYS show race, even "All Races"
3. **Base stats** (DEF/DMG/Delay) + **inline mods** (Attack, Accuracy, Double Attack, etc.)
4. **Killer effects** (each on own line)
5. **Latent effects** (each on own line)
6. **Multi-line effects** (each on own line)
7. **Description** (from item_text.description)

### Current Formatting Fixes Applied
- ✅ Haste: Now shows `Haste+5%` not `Haste+-5%`
- ✅ Movement Speed: Now shows `Movement Speed+12%` not `Mod169+12`
- ✅ Race: Now shows `(Scythe) All Races` not just `(Scythe)`
- ✅ Double Attack: Now shows on same line as DMG/Delay
- ✅ Full item names: Shows "Blood Finger Gauntlets" not "Blood Fng. Gnt."

---

## Maintenance Checklist

When adding new features or debugging tooltips:

1. ☐ Check if item has description in `item_text.description`
2. ☐ Verify latents exist in `item_latents` for conditional bonuses
3. ☐ Confirm enhanced_1_id/enhanced_2_id/enhanced_3_id links for +1/+2/+3 versions
4. ☐ Ensure all modIds used have entries in MOD_NAMES
5. ☐ Test tooltip displays full item name (from item_basic.name)
6. ☐ Verify race information displays even for "All Races"

---

## Future Improvements Needed

### High Priority
1. **Complete wiki description scraping** - Most critical for user experience
2. **Import missing latent data** - Important for weapon value assessment
3. **Add additional effect support** - Some weapons incomplete without this

### Medium Priority
4. **Verify all enhanced relationships** - May be other special upgrade paths missing
5. **Add more MOD_NAMES** - Discover through usage what other mods appear

### Low Priority
6. **Alternative description sources** - If ffxiclopedia is incomplete, try bg-wiki
7. **Description quality check** - Some descriptions may be malformed

---

## Testing Items

Use these items to verify tooltip functionality:

### Complete Data
- Hecatomb Mittens (should show all stats, description, +1 version)
- Blood Finger Gauntlets (should show all stats, Crimson base version)

### Incomplete Data
- Scarecrow Scythe (missing description, missing latent vs birds)
- Tonbo-Giri (missing description, missing latent vs vermin)
- Seal of Byakko (missing description)
- Aquarian Abjuration: Head (missing/bad description)

---

## Version History

- **2025-01-13**: Initial documentation created
  - Documented missing descriptions issue
  - Documented incomplete latent data
  - Confirmed enhanced relationships now populated
  - Added MOD_NAMES reference

**Last Updated**: 2025-01-13
**Maintained By**: Development Team
