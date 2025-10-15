# ABJURATION REFERENCE - PERMANENT DOCUMENTATION

**CRITICAL**: ALWAYS consult https://ffxiclopedia.fandom.com/wiki/Category:Abjuration for authoritative abjuration mappings.

## Database Schema

In `item_classifications` table:
- `converts_to_item_id`: The BASE cursed armor that the abjuration converts
- `enhanced_1_id`: The +1 version of that armor

## Complete Abjuration Mappings (Verified 2025-10-15)

All mappings verified against https://ffxiclopedia.fandom.com/wiki/Category:Abjuration

### Earthen Abjuration (Adaman → Armada)
- **Head**: adaman_celata → armada_celata
- **Body**: adaman_hauberk → armada_hauberk
- **Hands**: adaman_mufflers → armada_mufflers
- **Legs**: adaman_breeches → armada_breeches
- **Feet**: adaman_sollerets → armada_sollerets

### Dryadic Abjuration (Shura → Shura +1)
- **Head**: shura_zunari_kabuto → shura_zunari_kabuto_+1
- **Body**: shura_togi → shura_togi_+1
- **Hands**: shura_kote → shura_kote_+1
- **Legs**: shura_haidate → shura_haidate_+1
- **Feet**: shura_sune-ate → shura_sune-ate_+1

### Aquarian Abjuration (Zenith/Dalmatica → +1)
- **Head**: zenith_crown → zenith_crown_+1
- **Body**: dalmatica → dalmatica_+1
- **Hands**: zenith_mitts → zenith_mitts_+1
- **Legs**: zenith_slacks → zenith_slacks_+1
- **Feet**: zenith_pumps → zenith_pumps_+1

### Martial Abjuration (Koenig → Kaiser)
- **Head**: koenig_schaller → kaiser_schaller
- **Body**: koenig_cuirass → kaiser_cuirass
- **Hands**: koenig_handschuhs → kaiser_handschuhs
- **Legs**: koenig_diechlings → kaiser_diechlings
- **Feet**: koenig_schuhs → kaiser_schuhs

### Wyrmal Abjuration (Crimson → Blood)
- **Head**: crimson_mask → blood_mask
- **Body**: crimson_scale_mail → blood_scale_mail
- **Hands**: crimson_finger_gauntlets → blood_finger_gauntlets
- **Legs**: crimson_cuisses → blood_cuisses
- **Feet**: crimson_greaves → blood_greaves

### Neptunal Abjuration (Hecatomb → Hecatomb +1)
- **Head**: hecatomb_cap → hecatomb_cap_+1
- **Body**: hecatomb_harness → hecatomb_harness_+1
- **Hands**: hecatomb_mittens → hecatomb_mittens_+1
- **Legs**: hecatomb_subligar → hecatomb_subligar_+1
- **Feet**: hecatomb_leggings → hecatomb_leggings_+1

## Notes on Other Abjuration Types

### Abyssal, Arean, Oceanid, Supernal Abjurations
These abjurations are from later expansions and follow different mechanics. They are not part of the Sky Gods abjuration system documented here. If adding these to the database in the future, verify each mapping individually against the wiki.

## CRITICAL MISTAKE HISTORY

### 2025-10-15: Earthen Abjuration Head Mapping Error
- **WRONG**: adaman_barbuta (ID: 12420)
- **CORRECT**: adaman_celata (ID: 12429)
- **Lesson**: ALWAYS verify abjuration mappings against the official wiki page before adding to database

### 2025-10-15: Missing All Enhanced Mappings
- **PROBLEM**: 29 out of 30 abjurations had NULL for enhanced_1_id
- **ROOT CAUSE**: Initial database population only included base item mappings
- **SOLUTION**: Systematically verified all abjuration sets against wiki and populated all enhanced_1_id values
- **IMPACT**: Fixed all 6 abjuration sets (Earthen, Dryadic, Aquarian, Martial, Wyrmal, Neptunal)
- **Lesson**: Complete database population requires checking BOTH base and enhanced versions for all conversion items

## RULES FOR ABJURATION WORK

1. **NEVER** assume abjuration mappings - always check the wiki
2. **ALWAYS** consult https://ffxiclopedia.fandom.com/wiki/Category:Abjuration first
3. **VERIFY** each abjuration page individually for exact item names
4. **TEST** database mappings after adding/updating
5. **DOCUMENT** any changes with source wiki URL
