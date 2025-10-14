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

### Critical Formatting Rules (2025-01-14)

**MUST BE FOLLOWED EXACTLY - These rules define how wiki data transforms into tooltips:**

1. **Slot/Weapon Tag Alignment**: `[Head]`/`[Body]`/`(Great Axe)` are LEFT ALIGNED
   - No spaces or pixel offsets from other stats

2. **Race Placement**: Race goes IMMEDIATELY after closing bracket/parenthesis with NO SPACE
   - ✅ Correct: `[Head]All Races` or `(Great Axe)All Races`
   - ❌ Wrong: `[Head] All Races` or `(Great Axe) All Races`

3. **Stat Format**: NO SPACES between stat name and value
   - ✅ Correct: `HP+50`, `DEX+15`, `Haste+5%`
   - ❌ Wrong: `HP +50`, `DEX +15`, `Haste +5%`
   - **Note**: Removing spaces does NOT change which line the stat is on - wiki line is source of truth

4. **Colon Format**: NO SPACES after colons in stat labels
   - ✅ Correct: `DEF:35`, `DMG:94`, `Delay:504`, `Lv.75`
   - ❌ Wrong: `DEF: 35`, `DMG: 94`, `Delay: 504`, `Lv. 75`

5. **Elemental Resistance**: "Resistance to [Element]" maps to an image/symbol, NOT text
   - Example: "Resistance to Wind +10" → Wind resistance icon + "+10"
   - Elements: Fire, Ice, Wind, Earth, Lightning, Water, Light, Dark

6. **Job Requirements**: NO SPACES between jobs and forward slashes
   - ✅ Correct: `WAR/MNK/BST/BRD/RNG`
   - ❌ Wrong: `WAR / MNK / BST / BRD / RNG`

7. **Item Image Display**: Image icon from existing database with grey background
   - Use existing item images from database (not wiki images)
   - Grey background: `icon_background.webp` in frontend `item-images/` folder
   - Image and name both have padding from tooltip panel top
   - Image top padding = Name top padding + 2px
   - Ensures proper visual alignment with slight offset
   - Grey box ALWAYS displayed behind item icon

### Previous Formatting Fixes Applied
- ✅ Haste: Now shows `Haste+5%` not `Haste+-5%`
- ✅ Movement Speed: Now shows `Movement Speed+12%` not `Mod169+12`
- ✅ Race: Now shows `(Scythe)All Races` not just `(Scythe)` (NO SPACE after parenthesis)
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

### ⚠️ CRITICAL PRIORITY - Comprehensive Wiki Scraping Project

**Status**: PLANNED - Extremely Important
**Start Date**: TBD
**Test Set**: Sky Gear (Byakko's Haidate, Genbu's Kabuto, Kirin's Osode, etc.)

This is a major undertaking to completely overhaul tooltip data by scraping the entire FFXI Fandom Wiki.

**Objectives**:
1. **Extract exact tooltip formatting** from wiki "Statistics" sections
2. **Capture all hidden effects** listed on wiki pages
3. **Update all missing item descriptions** with proper formatting
4. **Discover and map unknown MOD definitions**
5. **Match wiki formatting exactly** for every piece of gear
6. **Create permanent storage** for wiki-formatted tooltip data

**Wiki Structure** (Reference: https://ffxiclopedia.fandom.com/wiki/Crimson_Greaves):
- URL Pattern: `https://ffxiclopedia.fandom.com/wiki/Item_Name` (Upper_Case format)
- Target Section: "Statistics" - contains exact tooltip text
- Hidden Effects: Listed separately under "Statistics"
- Description: Full formatted description text

**Problems This Solves**:
- ❌ Attributes split across newlines in tooltips
- ❌ Missing/incomplete descriptions
- ❌ Unknown MOD definitions showing as "Mod###"
- ❌ Hidden effects not displayed (e.g., Dragon Affinity)
- ❌ Inconsistent formatting vs. actual game tooltips

**Implementation Plan**:

**Phase 1: Architecture & Test Set**
1. Create `scrape_wiki_statistics.js` targeting "Statistics" sections
2. Extract structured data:
   - Tooltip text lines (exact formatting)
   - Hidden effects
   - Description text
3. Test with Sky Gear items first (10-15 items)
4. Validate formatting matches wiki exactly

**Phase 2: Database Schema**
1. Create `item_wiki_tooltips` table:
   ```sql
   CREATE TABLE item_wiki_tooltips (
       item_id INT PRIMARY KEY REFERENCES item_basic(itemid),
       tooltip_lines JSONB,           -- Array of formatted tooltip lines
       hidden_effects JSONB,          -- Array of hidden effects
       wiki_description TEXT,         -- Full description from wiki
       mod_mappings JSONB,            -- Any discovered mod definitions
       last_scraped TIMESTAMP,
       wiki_url VARCHAR(500)
   );
   ```

**Phase 3: Full Wiki Scraping**
1. Scrape all equipment items (armor, weapons)
2. Scrape all consumables with effects
3. Scrape all pop items and key items with descriptions
4. Rate-limit: 1 request per 500ms to avoid throttling
5. Implement resume capability for interrupted scrapes
6. Log all errors and missing items

**Phase 4: Tooltip Rendering Update**
1. Modify `buildItemStatLines()` to use wiki data if available
2. Fall back to current mod-based system if wiki data missing
3. Add "Source: Wiki" indicator for wiki-formatted tooltips
4. Preserve Community Notes section for hidden effects

**Phase 5: Validation & Testing**
1. Compare wiki tooltips vs. current system for test set
2. User acceptance testing with Sky Gear
3. Fix any formatting discrepancies
4. Document any items that can't be auto-formatted

**Technical Considerations**:
- Wiki pages may have inconsistent HTML structure
- Some items may not have wiki pages
- Hidden effects may be listed in various formats
- Need robust HTML parsing (cheerio/jsdom)
- Need error handling for 404s and malformed pages
- Consider caching wiki HTML for debugging

**Maintenance Strategy**:
- Re-scrape quarterly for new items
- Manual override system for incorrect wiki data
- Track wiki page last-modified dates
- Flag items where wiki data conflicts with database

**Success Criteria**:
✅ 95%+ of equipment items have wiki-formatted tooltips
✅ All Sky Gear items perfectly match wiki formatting
✅ Zero "Mod###" entries in tooltips for common gear
✅ All hidden effects captured and displayed
✅ No attributes split across newlines
✅ Descriptions match wiki formatting exactly

**Alternative Approaches**:
- If ffxiclopedia is incomplete, also scrape bg-wiki.com
- Manual data entry for critical items (relic, mythic, empyrean)
- Community contribution system for missing data

**PROGRESS UPDATE (2025-01-14)**:

**Phase 1: COMPLETE ✅**
- ✅ Created `scrape_wiki_statistics.js` with full HTML parsing capability
- ✅ Successfully extracts tooltip lines, hidden effects, and descriptions
- ✅ Tested with Sky Gear set (11 items: 8 armor + 3 weapons)
- ✅ Handles both Rare/Ex and non-Rare/Ex items correctly
- ✅ Parses armor (DEF-based) and weapons (DMG/Delay-based) formats

**Wiki Scraper Features Implemented**:
- `cleanDivText()` - Recursive HTML parsing with structure preservation
- `extractHiddenEffects()` - Captures "Hidden Effect" sections from wiki
- `scrapeWikiPage()` - Main scraping function with error handling
- Elemental resistance parsing (Ice +20, Wind +20, etc.)
- Proper spacing in resistance formatting

**Comparison System Added**:
- `parseWikiStats()` - Extracts stats from wiki tooltip lines using multiple regex patterns
- `fetchDatabaseStats()` - Queries item_mods, item_equipment, item_weapon, item_latents
- `compareStats()` - Side-by-side comparison with match/difference reporting
- Identifies unknown mods that need mapping

**Critical Fixes Applied (2025-01-14)**:
1. ✅ **URL Formatting Fix**: Wiki uses Title_Case for ALL words in hyphenated items
   - Example: `Suzaku%27s_Sune-Ate` (capital A in "Ate")
   - Rule: ALWAYS capitalize each word in hyphenated compound names

2. ✅ **Elemental Resistance Parsing**: Fixed Water/Fire resistance extraction
   - Added link title attribute checking (`title="Water Resistance"`)
   - Added Mod15 (Fire Resistance) to MOD_NAMES
   - Fixed bold tag recursive processing to handle nested elements

3. ✅ **Title Case Stat Parsing**: Fixed Attack/Accuracy extraction
   - Added regex pattern specifically for Title Case single-word stats
   - Pattern order matters: multi-word → Title Case → all caps

4. ✅ **Line Extraction Logic (CRITICAL)**: Fixed to match wiki visual display exactly
   - **Before**: Split stats into separate lines (DEF: 11, HP +15, Attack +6) → 7 lines
   - **After**: Keep stats together on same line (DEF: 11 HP +15 Attack +6) → 5 lines
   - **Rule**: Only split on explicit `<br>` tags, NOT on multiple stats in same div
   - This ensures tooltip line count matches wiki's visual display exactly

**Test Results from Sky Gear Set** (as of 2025-01-14):
- **Byakko's Haidate**: 4 lines, 4/4 stats match (100%) ✅
  - Line 2: "DEF: 42 DEX +15 Resistance to Lightning +50 Haste +5%"
- **Genbu's Kabuto**: 4 lines, 4/4 stats match (100%) ✅
  - Line 2: "DEF: 35 HP +50 VIT +15 Water +50"
- **Kirin's Osode**: 6 lines, 10/10 stats match (100%) ✅
  - Line 2-4: Multi-line stats (DEF, MP, STR, DEX, VIT, AGI, INT, MND, CHR, Light Resistance)
- **Seiryu's Kote**: 5 lines, 4/4 stats match (100%) ✅
  - Line 2-3: DEF, HP, AGI, Ranged Accuracy
- **Suzaku's Sune-Ate**: 5 lines, 3/3 stats match (100%) ✅
  - Fixed URL formatting: Suzaku%27s_Sune-Ate (capital A)
  - Line 2-3: DEF, MND, Fire Resistance, Blaze Spikes effect
- **Crimson Greaves**: 5 lines, 9/9 stats match (100%) ✅
  - Dragon Affinity captured as hidden effect
- **Blood Greaves**: 5 lines, 9/9 stats match (100%) ✅
  - Dragon Affinity captured as hidden effect
- **Walkure Mask**: 5 lines, 3/3 stats match (100%) ✅
  - Line 2: "DEF: 11 HP +15 Attack +6" (fixed to keep stats together)
- **Tonbo-Giri**: 4 lines, 4/4 stats match (100%) ✅
  - Line 2-3: DMG, Delay, AGI, Enmity, Vermin crit bonus
- **Scarecrow Scythe**: 4 lines, 3/3 stats match (100%) ✅
  - Line 2-3: DMG, Delay, Double Attack, Bind vs birds
- **Byakko's Axe**: 5 lines, 3/10 stats match (special effect mods need mapping)

**Elemental Resistance Mods Mapped**:
- ✅ Mod16: Ice Resistance
- ✅ Mod17: Wind Resistance
- ✅ Mod18: Earth Resistance
- ✅ Mod19: Lightning Resistance
- ✅ Mod20: Water Resistance
- ✅ Mod21: Light Resistance
- ✅ Mod22: Dark Resistance

**Unknown Mods Requiring Research**:
- Mod230: Unknown (on Byakko's Axe)
- Mod431: Weapon Skill Accuracy (already mapped in frontend)
- Mod499: Additional Effect Type
- Mod500: Additional Effect Element/Creature (value 19 = Birds on Scarecrow Scythe)
- Mod501: Additional Effect Damage/Value
- Mod950: Unknown (on Byakko's Axe)

**Key Findings**:
- Wiki shows "Ice +20" but database stores as "Ice Resistance +20" (Mod16)
- Hidden effects like "Dragon Affinity" are captured separately from stats
- Weapon latent effects (e.g., "Vs. vermin: Critical hit rate +3%") are on wiki but NOT in database
- Special weapon effects ("Enhances Beast Killer", "Additional effect: Wind damage") use mod system
- **CRITICAL**: Wiki visual lines don't always match HTML structure
  - Multiple stats in ONE div = ONE visual line (e.g., "DEF: 11 HP +15 Attack +6")
  - Only split on explicit `<br>` tags for accurate line count
  - CSS/spacing creates visual appearance, not HTML structure

**Phase 2: COMPLETE ✅** (2025-01-14)

**Database Schema Created**:
- ✅ Migration 031: Created `item_wiki_tooltips` table
  * `item_id` INT PRIMARY KEY (references item_basic)
  * `tooltip_lines` JSONB (array of formatted tooltip lines)
  * `hidden_effects` JSONB (array of hidden effects)
  * `wiki_description` TEXT (full wiki description)
  * `wiki_url` VARCHAR(500) (source URL)
  * `last_scraped` TIMESTAMP (tracking stale data)

**Test Data Inserted**:
- ✅ 4 items successfully populated with wiki-formatted tooltips
  * Genbu's Kabuto (4 lines)
  * Kirin's Osode (6 lines)
  * Byakko's Haidate (4 lines)
  * Byakko's Axe (5 lines)

**Formatting Rules Applied**:
- ✅ No space after slot/weapon brackets: `[Head]All Races`
- ✅ No spaces in stat increases: `HP+50`, `DEX+15`
- ✅ No spaces after colons: `DEF:35`, `DMG:94`, `Delay:504`, `Lv.75`
- ✅ No spaces in job lists: `WAR/MNK/BST/BRD/RNG`
- ✅ Elemental resistances kept as text (frontend will map to images)

**Verified Examples**:
```
genbus_kabuto:
  Line 1: [Head]All Races
  Line 2: DEF:35 HP+50 VIT+15 Water+50
  Line 3: Lv.75 WAR/MNK/BST/BRD/RNG/SAM/
  Line 4: NIN

byakkos_haidate:
  Line 1: [Legs]All Races
  Line 2: DEF:42 DEX+15 Resistance to Lightning+50 Haste+5%
  Line 3: Lv.75 WAR/MNK/BST/BRD/RNG/SAM/
  Line 4: NIN

byakkos_axe:
  Line 1: (Great Axe)All Races
  Line 2: DMG:94 Delay:504 Resistance to Wind+10 Attack+5
  Line 3: Enhances "Beast Killer" effect
  Line 4: Additional effect:Wind damage
  Line 5: Lv.74 WAR/DRK
```

**Images**: Use existing database images with `icon_background.webp` grey box

**Next Steps**:
- Research and map remaining unknown mods (230, 499, 500, 501, 950)
- Clean up debug output from scraper
- Expand test set to include accessories, consumables
- Run full scrape when validation complete
- Integrate with frontend to display wiki tooltips

**Estimated Effort**:
- Phase 1-2: 1-2 days
- Phase 3: 2-3 days (depending on item count)
- Phase 4-5: 1-2 days
- **Total: ~1 week of focused development**

---

### High Priority (Post-Wiki Scraping)
1. **Verify all enhanced relationships** - May be other special upgrade paths missing
2. **Alternative description sources** - If ffxiclopedia is incomplete, try bg-wiki

### Medium Priority
3. **Description quality check** - Some wiki descriptions may be malformed
4. **MOD_NAMES completeness** - Ensure all mods from wiki are mapped

### Low Priority
5. **Tooltip performance optimization** - Cache wiki data in frontend
6. **User-submitted corrections** - Allow reporting incorrect wiki data

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
