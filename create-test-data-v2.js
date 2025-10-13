const fs = require('fs');
const path = require('path');

const CONVERTED_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';
const TEST_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\test-sql';

// Create test directory
if (!fs.existsSync(TEST_PATH)) {
    fs.mkdirSync(TEST_PATH, { recursive: true });
}

console.log('=== Creating Test Data Files (V2 - With Matching IDs) ===\n');

// Step 1: Extract item IDs from equipment and weapons
console.log('Step 1: Extracting item IDs from equipment and weapons...\n');

function extractItemIds(filePath, maxItems) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const itemIds = new Set();
    let count = 0;

    for (const line of lines) {
        if (line.trim().startsWith('INSERT INTO')) {
            const match = line.match(/VALUES \((\d+),/);
            if (match && count < maxItems) {
                itemIds.add(parseInt(match[1]));
                count++;
            }
        }
    }

    return itemIds;
}

const equipmentIds = extractItemIds(path.join(CONVERTED_PATH, '002_item_equipment.sql'), 50);
console.log(`  ✓ Extracted ${equipmentIds.size} equipment item IDs`);

const weaponIds = extractItemIds(path.join(CONVERTED_PATH, '003_item_weapon.sql'), 30);
console.log(`  ✓ Extracted ${weaponIds.size} weapon item IDs`);

const allItemIds = new Set([...equipmentIds, ...weaponIds]);
console.log(`  ✓ Total unique item IDs: ${allItemIds.size}`);

// Step 2: Extract matching items from item_basic
console.log('\nStep 2: Extracting matching items from item_basic...\n');

function createFilteredFile(inputFile, outputFile, validIds, tableName) {
    const inputPath = path.join(CONVERTED_PATH, inputFile);
    const outputPath = path.join(TEST_PATH, outputFile);
    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');

    let outputLines = [];
    let insertCount = 0;

    // Copy header and CREATE TABLE
    for (const line of lines) {
        if (!line.trim().startsWith('INSERT INTO')) {
            outputLines.push(line);
        } else {
            break;
        }
    }

    // Filter INSERT statements
    for (const line of lines) {
        if (line.trim().startsWith('INSERT INTO')) {
            const match = line.match(/VALUES \((\d+),/);
            if (match) {
                const itemId = parseInt(match[1]);
                if (validIds.has(itemId)) {
                    outputLines.push(line.trim());
                    insertCount++;
                }
            }
        }
    }

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`  ✓ Created ${outputFile} with ${insertCount} items`);
}

// Create filtered item_basic
createFilteredFile('001_item_basic.sql', 'test_001_item_basic.sql', allItemIds, 'item_basic');

// Create filtered item_equipment
createFilteredFile('002_item_equipment.sql', 'test_002_item_equipment.sql', equipmentIds, 'item_equipment');

// Create filtered item_weapon
createFilteredFile('003_item_weapon.sql', 'test_003_item_weapon.sql', weaponIds, 'item_weapon');

// Step 3: Copy all weapon_skills
console.log('\nStep 3: Copying weapon_skills...\n');

function copyFile(inputFile, outputFile) {
    const inputPath = path.join(CONVERTED_PATH, inputFile);
    const outputPath = path.join(TEST_PATH, outputFile);

    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');
    const insertCount = lines.filter(l => l.trim().startsWith('INSERT INTO')).length;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`  ✓ Copied ${outputFile} with ${insertCount} items`);
}

copyFile('004_weapon_skills.sql', 'test_004_weapon_skills.sql');

// Step 4: Create filtered item_mods
console.log('\nStep 4: Creating filtered item_mods...\n');

createFilteredFile('005_item_mods.sql', 'test_005_item_mods.sql', allItemIds, 'item_mods');

console.log('\n✅ Test data files created!');
console.log(`Output directory: ${TEST_PATH}`);
console.log('\nTest files created with MATCHING item IDs:');
console.log(`  - test_001_item_basic.sql (${allItemIds.size} items)`);
console.log(`  - test_002_item_equipment.sql (${equipmentIds.size} items)`);
console.log(`  - test_003_item_weapon.sql (${weaponIds.size} items)`);
console.log('  - test_004_weapon_skills.sql (all 209 weapon skills)');
console.log('  - test_005_item_mods.sql (filtered mods for test items)');
console.log('\nNext: Truncate tables and run import-test-data.js');
