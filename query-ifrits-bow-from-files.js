const fs = require('fs');
const path = require('path');

console.log('=== Ifrit\'s Bow Details (from converted files) ===\n');

const CONVERTED_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';

// Helper to find and parse item
function findItem(fileName, pattern) {
    const filePath = path.join(CONVERTED_PATH, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.includes(pattern)) {
            return line;
        }
    }
    return null;
}

// Get item ID first
const basicLine = findItem('001_item_basic.sql', 'ifrits_bow');
if (!basicLine) {
    console.log('❌ Ifrit\'s Bow not found in converted data');
    process.exit(1);
}

// Parse basic info
const basicMatch = basicLine.match(/VALUES \((\d+), (\d+), '([^']+)', '([^']+)', (\d+), (\d+), (\d+), (\d+), (\d+), (true|false), (true|false)\)/);
if (!basicMatch) {
    console.log('❌ Could not parse item_basic line');
    process.exit(1);
}

const [, itemId, subid, name, sortname, stackSize, flags, aH, NoSale, BaseSell, is_rare, is_ex] = basicMatch;

console.log('BASIC INFO:');
console.log(`  Item ID: ${itemId}`);
console.log(`  Name: ${name}`);
console.log(`  Rare: ${is_rare === 'true' ? 'YES' : 'NO'}`);
console.log(`  Ex: ${is_ex === 'true' ? 'YES' : 'NO'}`);
console.log(`  Stack Size: ${stackSize}`);
console.log(`  Base Sell Price: ${BaseSell} gil`);

// Check equipment table
const equipLine = findItem('002_item_equipment.sql', `VALUES (${itemId},`);
if (equipLine) {
    // Parse: itemId, name, level, ilevel, jobs, MId, shieldSize, scriptType, slot, rslot, su_level, race
    const equipMatch = equipLine.match(/VALUES \((\d+),'([^']*)',(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (equipMatch) {
        const [, eqItemId, eqName, level, ilevel, jobs, MId, shieldSize, scriptType, slot, rslot, su_level, race] = equipMatch;

        console.log('\nEQUIPMENT INFO:');
        console.log(`  Level: ${level}`);
        console.log(`  Item Level: ${ilevel}`);
        console.log(`  Slot: ${slot} (2=Range)`);
        console.log(`  Jobs (bitfield): ${jobs}`);
        console.log(`  Race: ${race === '255' ? 'All Races' : race}`);

        // Decode jobs bitfield
        const jobNames = ['WAR', 'MNK', 'WHM', 'BLM', 'RDM', 'THF', 'PLD', 'DRK', 'BST', 'BRD', 'RNG', 'SAM', 'NIN', 'DRG', 'SMN', 'BLU', 'COR', 'PUP', 'DNC', 'SCH', 'GEO', 'RUN'];
        const jobsInt = BigInt(jobs);
        const allowedJobs = [];
        for (let i = 0; i < jobNames.length; i++) {
            if ((jobsInt & (1n << BigInt(i))) !== 0n) {
                allowedJobs.push(jobNames[i]);
            }
        }
        console.log(`  Allowed Jobs: ${allowedJobs.length > 0 ? allowedJobs.join(', ') : 'None'}`);
    }
} else {
    console.log('\n⚠️ Not found in equipment table');
}

// Check weapon table
const weaponLine = findItem('003_item_weapon.sql', `VALUES (${itemId},`);
if (weaponLine) {
    // Parse: itemId, name, skill, subskill, ilvl_skill, ilvl_parry, ilvl_macc, dmgType, hit, delay, dmg, unlock_points
    const weaponMatch = weaponLine.match(/VALUES \((\d+),'([^']*)',(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (weaponMatch) {
        const [, wpnItemId, wpnName, skill, subskill, ilvl_skill, ilvl_parry, ilvl_macc, dmgType, hit, delay, dmg, unlock_points] = weaponMatch;

        console.log('\nWEAPON INFO:');

        // Decode skill type
        const skillNames = ['None', 'Hand-to-Hand', 'Dagger', 'Sword', 'Great Sword', 'Axe', 'Great Axe', 'Scythe', 'Polearm', 'Katana', 'Great Katana', 'Club', 'Staff', 'Archery', 'Marksmanship', 'Throwing'];
        console.log(`  Weapon Type: ${skillNames[skill] || `Unknown (${skill})`}`);
        console.log(`  Damage: ${dmg}`);
        console.log(`  Delay: ${delay}`);

        // Decode damage type
        const dmgTypes = ['None', 'Piercing', 'Slashing', 'Blunt', 'Hand-to-Hand', 'Fire', 'Ice', 'Wind', 'Earth', 'Lightning', 'Water', 'Light', 'Dark'];
        const dmgTypeInt = parseInt(dmgType);
        console.log(`  Damage Type: ${dmgTypes[dmgTypeInt] || `Unknown (${dmgType})`}`);
        console.log(`  Accuracy: ${hit > 0 ? `+${hit}` : hit}`);
    }
} else {
    console.log('\n⚠️ Not found in weapon table');
}

// Check item_mods
const modsContent = fs.readFileSync(path.join(CONVERTED_PATH, '005_item_mods.sql'), 'utf8');
const modsLines = modsContent.split('\n').filter(line => line.includes(`VALUES (${itemId},`));

if (modsLines.length > 0) {
    console.log('\nITEM MODS / ATTRIBUTES:');

    // Common mod names
    const modNames = {
        1: 'DEF', 2: 'HP', 3: 'HPP', 5: 'MP', 6: 'MPP',
        8: 'STR', 9: 'DEX', 10: 'VIT', 11: 'AGI', 12: 'INT', 13: 'MND', 14: 'CHR',
        23: 'ATT', 24: 'RATT', 25: 'ACC', 26: 'RACC',
        28: 'MATT', 29: 'MACC', 30: 'MDEF',
        73: 'REFRESH', 165: 'SKILLCAP',
        355: 'ADDS_WEAPONSKILL', 356: 'ADDS_WEAPONSKILL_DYN'
    };

    modsLines.forEach(line => {
        const match = line.match(/VALUES \((\d+), (\d+), (-?\d+)\)/);
        if (match) {
            const [, itemId, modId, value] = match;
            const modName = modNames[modId] || `MOD_${modId}`;

            if (modId === '355' || modId === '356') {
                console.log(`  ${modName}: Weapon Skill ID ${value} (check weapon_skills table)`);
            } else {
                console.log(`  ${modName}: ${value > 0 ? '+' : ''}${value}`);
            }
        }
    });
} else {
    console.log('\nITEM MODS / ATTRIBUTES: None');
}

console.log('\n' + '='.repeat(50));
console.log('✅ Item details extracted from converted files');
console.log('This data will be available after full import.');
