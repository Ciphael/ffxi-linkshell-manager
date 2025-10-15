# ABJURATION REFERENCE - PERMANENT DOCUMENTATION

**CRITICAL**: ALWAYS consult https://ffxiclopedia.fandom.com/wiki/Category:Abjuration for authoritative abjuration mappings.

## Database Schema

In `item_classifications` table:
- `converts_to_item_id`: The BASE cursed armor that the abjuration converts
- `enhanced_1_id`: The +1 version of that armor

## Known Abjurations (MUST VERIFY AGAINST WIKI)

### Earthen Abjuration (Adaman/Armada Set)
- **Head**: cursed_celata → adaman_celata / armada_celata
- **Body**: cursed_hauberk → adaman_hauberk / armada_hauberk
- **Hands**: cursed_mufflers → adaman_mufflers / armada_mufflers
- **Legs**: cursed_breeches → adaman_breeches / armada_breeches
- **Feet**: cursed_sollerets → adaman_sollerets / armada_sollerets

### Dryadic Abjuration (Koenig/Kaiser Set)
- **Head**: shaded_*item* → koenig_*item* / kaiser_*item*
- Must verify exact items against wiki

### Aquarian Abjuration (Zenith Set)
- **Head**: cursed_crown → zenith_crown / zenith_crown_+1
- **Body**: cursed_dalmatica → dalmatica / dalmatica_+1
- **Hands**: cursed_mitts → zenith_mitts / zenith_mitts_+1
- **Legs**: cursed_slacks → zenith_slacks / zenith_slacks_+1
- **Feet**: cursed_pumps → zenith_pumps / zenith_pumps_+1

### Wyrmal Abjuration (Blood/Crimson Set)
- Must verify exact items against wiki

### Oceanid Abjuration
- Must verify against wiki

### Neptunal Abjuration
- Must verify against wiki

### Martial Abjuration
- Must verify against wiki

### Supernal Abjuration
- Must verify against wiki

### Abyssal Abjuration (Apogee Set)
- **Head**: bewitched_crown → apogee_crown / apogee_crown_+1
- **Body**: bewitched_dalmatica → apogee_dalmatica / apogee_dalmatica_+1
- **Hands**: bewitched_mitts → apogee_mitts / apogee_mitts_+1
- **Legs**: bewitched_slacks → apogee_slacks / apogee_slacks_+1
- **Feet**: bewitched_pumps → apogee_pumps / apogee_pumps_+1

### Arean Abjuration (Ryuo Set)
- **Head**: vexed_somen → ryuo_somen / ryuo_somen_+1
- **Body**: vexed_domaru → ryuo_domaru / ryuo_domaru_+1
- **Hands**: vexed_kote → ryuo_tekko / ryuo_tekko_+1
- **Legs**: vexed_hakama → ryuo_hakama / ryuo_hakama_+1
- **Feet**: vexed_sune-ate → ryuo_sune-ate / ryuo_sune-ate_+1

## CRITICAL MISTAKE HISTORY

### 2025-10-15: Earthen Abjuration Head
- **WRONG**: adaman_barbuta (ID: 12420)
- **CORRECT**: adaman_celata (ID: 12429)
- **Lesson**: ALWAYS verify abjuration mappings against the official wiki page before adding to database

## RULES FOR ABJURATION WORK

1. **NEVER** assume abjuration mappings - always check the wiki
2. **ALWAYS** consult https://ffxiclopedia.fandom.com/wiki/Category:Abjuration first
3. **VERIFY** each abjuration page individually for exact item names
4. **TEST** database mappings after adding/updating
5. **DOCUMENT** any changes with source wiki URL
