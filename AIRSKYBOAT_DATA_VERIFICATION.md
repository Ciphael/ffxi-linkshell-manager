# AirSkyBoat Data Import - Verification Report

## Data Sources Confirmed

### 1. item_basic.sql (22,132 lines)
**Fields:**
- `itemid` - Primary key
- `name` - Item name (snake_case)
- `stackSize` - How many can stack
- **`flags`** - Bitwise flags containing:
  - Bit 0x04 (4) = **RARE**
  - Bit 0x40 (64) = **EXCLUSIVE (Ex)**
  - Bit 0x20 (32) = NO_NPC_SALE
  - Bit 0x1000 (4096) = NO_AUCTION
  - Bit 0x8000 (32768) = CAN_USE
- `NoSale` - Cannot be sold to NPCs (0/1)
- `BaseSell` - Vendor sell price

**Status:** ✅ Provides Rare/Ex information

### 2. item_equipment.sql (14,364 lines)
**Fields:**
- `itemId` - Primary key
- `name` - Equipment name
- **`level`** - Required level ✓
- **`ilevel`** - Item level (FILTER OUT if > 0 or != level)
- **`jobs`** - Bitwise job flags ✓
- `slot` - Equipment slot
- `shieldSize` - Shield size if applicable

**Status:** ✅ Provides level, jobs, slot
**Filter:** Exclude items where ilevel > 0 AND level >= 76

### 3. item_weapon.sql (4,849 lines)
**Fields:**
- `itemId` - Primary key
- `name` - Weapon name
- `skill` - Weapon skill type
- **`dmg`** - Base damage ✓
- **`delay`** - Attack delay ✓
- `dmgType` - Damage type (slashing/piercing/blunt)
- `hit` - Accuracy

**Status:** ✅ Provides dmg, delay
**Note:** Weapons don't have level in this table - must join with item_basic or item_equipment

### 4. item_mods.sql (79,773 lines)
**Fields:**
- `itemId` - Item reference
- `modId` - Stat/mod reference
- `value` - Mod value

**Examples:**
```sql
INSERT INTO `item_mods` VALUES (10255,1,77);    -- DEF: 77
INSERT INTO `item_mods` VALUES (10255,8,15);    -- STR: 15
INSERT INTO `item_mods` VALUES (10255,9,15);    -- DEX: 15
INSERT INTO `item_mods` VALUES (18263,356,10);  -- ADDS_WEAPONSKILL_DYN: 10
```

**Status:** ✅ Provides ALL stats, mods, effects

### 5. weapon_skills.sql (281 lines)
**Fields:**
- `weaponskillid` - Primary key
- `name` - Weapon skill name (e.g., 'metatron_torment')
- `jobs` - Which jobs can use
- `skilllevel` - Required skill level

**Key Example:**
- weaponskillid 89 = **'metatron_torment'**

**Status:** ✅ Solves ADDS_WEAPONSKILL display issue

### 6. mods table (already in database)
**Fields:**
- `modid` - Primary key
- `name` - Mod name (e.g., 'ADDS_WEAPONSKILL_DYN', 'STR', 'DEX')

**Status:** ✅ Already have this

## Data We CAN Extract

| Attribute | Source Table | Field/Calculation |
|-----------|--------------|-------------------|
| **Item Name** | item_basic | `name` |
| **Level Required** | item_equipment | `level` |
| **Rare** | item_basic | `flags & 0x04` |
| **Ex (Exclusive)** | item_basic | `flags & 0x40` |
| **Jobs** | item_equipment | `jobs` (bitwise) |
| **Slot** | item_equipment | `slot` |
| **Damage** | item_weapon | `dmg` |
| **Delay** | item_weapon | `delay` |
| **All Stats** | item_mods + mods | Join on modid |
| **Weapon Skills** | item_mods + weapon_skills | For ADDS_WEAPONSKILL mods |
| **Stack Size** | item_basic | `stackSize` |
| **Vendor Price** | item_basic | `BaseSell` |

## Import Filters

### MUST Exclude:
1. **Items with level >= 76**
   - `WHERE level < 76`

2. **Items with ilevel > 0** (these don't exist in this era)
   - `WHERE ilevel = 0`

3. **Items where ilevel != level** (safety check)
   - `WHERE ilevel = 0 OR ilevel = level`

### Data Volume Estimate:
- Total items in AirSkyBoat: ~22,000
- Equipment items: ~14,000
- Weapons: ~4,800
- After filtering (level < 76, ilevel = 0): **~12,000-15,000 items**

## MySQL → PostgreSQL Conversion Requirements

### Data Type Mappings:
| MySQL | PostgreSQL |
|-------|------------|
| `tinyint` | `smallint` |
| `smallint(5) unsigned` | `integer` |
| `int(10) unsigned` | `bigint` |
| `tinytext` | `text` |
| `binary(22)` | `bytea` |

### Syntax Changes:
- Backticks `` `table` `` → Double quotes `"table"`
- `ENGINE=MyISAM` → Remove entirely
- `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
- `LOCK TABLES` / `UNLOCK TABLES` → Remove
- Multiple INSERT → Keep as-is (PostgreSQL supports this)

## Proposed Database Schema

### Unified `items` table:
```sql
CREATE TABLE items (
    itemid INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'equipment', 'weapon', 'usable', 'currency'

    -- Basic attributes
    level SMALLINT DEFAULT 0,
    jobs BIGINT DEFAULT 0, -- Bitwise job flags
    slot INTEGER, -- Equipment slot (if applicable)

    -- Flags
    is_rare BOOLEAN DEFAULT FALSE,
    is_ex BOOLEAN DEFAULT FALSE,
    stack_size SMALLINT DEFAULT 1,
    no_sale BOOLEAN DEFAULT FALSE,
    vendor_price INTEGER DEFAULT 0,

    -- Weapon-specific
    weapon_skill SMALLINT, -- Weapon skill type
    dmg INTEGER, -- Base damage
    delay INTEGER, -- Attack delay
    dmg_type INTEGER, -- Damage type

    -- Stats stored separately in item_mods
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_mods (
    id SERIAL PRIMARY KEY,
    itemid INTEGER REFERENCES items(itemid) ON DELETE CASCADE,
    modid INTEGER REFERENCES mods(modid),
    value INTEGER NOT NULL,
    UNIQUE(itemid, modid)
);

CREATE TABLE weapon_skills (
    weaponskillid SMALLINT PRIMARY KEY,
    name TEXT NOT NULL,
    jobs BYTEA, -- Binary job flags
    skill_level SMALLINT DEFAULT 0
);
```

## Next Steps

1. ✅ Verified all data fields exist
2. ⏳ Create conversion script (MySQL → PostgreSQL)
3. ⏳ Build import with filters (level < 76, ilevel = 0)
4. ⏳ Import weapon_skills table
5. ⏳ Update frontend to display rare/ex/proper stats
6. ⏳ Update stat display to show weapon skill names

## Estimated Timeline

- **Script Creation:** 1-2 hours
- **Data Import:** 20-30 minutes (with filters)
- **Frontend Updates:** 1-2 hours
- **Testing:** 30 minutes

**Total:** ~4-5 hours of work (can be done in sessions)
