const fs = require('fs');
const path = require('path');

const CONVERTED_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';
const TEST_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\test-sql';

// Create test directory
if (!fs.existsSync(TEST_PATH)) {
    fs.mkdirSync(TEST_PATH, { recursive: true });
}

/**
 * Extract sample data from a SQL file
 * Takes first N INSERT statements and related items
 */
function createTestFile(inputFile, outputFile, options = {}) {
    console.log(`Creating test data for ${inputFile}...`);

    const inputPath = path.join(CONVERTED_PATH, inputFile);
    const outputPath = path.join(TEST_PATH, outputFile);

    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');

    let outputLines = [];
    let insertCount = 0;
    let maxInserts = options.maxInserts || 100;
    let itemIds = new Set();

    // Copy header and CREATE TABLE
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Include everything before INSERT statements
        if (!line.startsWith('INSERT INTO')) {
            outputLines.push(line);
        } else {
            // Start collecting INSERTs
            break;
        }
    }

    // Collect INSERT statements
    for (const line of lines) {
        if (line.trim().startsWith('INSERT INTO')) {
            if (insertCount < maxInserts) {
                outputLines.push(line.trim());
                insertCount++;

                // Track item IDs for filtering item_mods
                if (options.trackItemIds) {
                    const match = line.match(/VALUES \((\d+),/);
                    if (match) {
                        itemIds.add(parseInt(match[1]));
                    }
                }
            } else {
                break;
            }
        }
    }

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`  ✓ Created ${outputFile} with ${insertCount} items`);

    return itemIds;
}

/**
 * Create filtered item_mods test data (only mods for test items)
 */
function createTestItemMods(validItemIds) {
    console.log('Creating test data for item_mods.sql...');

    const inputPath = path.join(CONVERTED_PATH, '005_item_mods.sql');
    const outputPath = path.join(TEST_PATH, 'test_005_item_mods.sql');

    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');

    let outputLines = [];
    let insertCount = 0;

    // Copy header and CREATE TABLE
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line.startsWith('INSERT INTO')) {
            outputLines.push(line);
        } else {
            break;
        }
    }

    // Filter INSERT statements to only include mods for our test items
    for (const line of lines) {
        if (line.trim().startsWith('INSERT INTO')) {
            const match = line.match(/VALUES \((\d+),/);
            if (match) {
                const itemId = parseInt(match[1]);
                if (validItemIds.has(itemId)) {
                    outputLines.push(line.trim());
                    insertCount++;
                }
            }
        }
    }

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`  ✓ Created test_005_item_mods.sql with ${insertCount} mods`);
}

// Main execution
console.log('=== Creating Test Data Files ===\n');

// Create test files with sample data
console.log('Step 1: Creating sample item files...\n');

// 100 items from item_basic
createTestFile('001_item_basic.sql', 'test_001_item_basic.sql', {
    maxInserts: 100
});

// 50 equipment items (track IDs for filtering)
const equipmentIds = createTestFile('002_item_equipment.sql', 'test_002_item_equipment.sql', {
    maxInserts: 50,
    trackItemIds: true
});

// 30 weapons (track IDs for filtering)
const weaponIds = createTestFile('003_item_weapon.sql', 'test_003_item_weapon.sql', {
    maxInserts: 30,
    trackItemIds: true
});

// All weapon skills (small table)
createTestFile('004_weapon_skills.sql', 'test_004_weapon_skills.sql', {
    maxInserts: 999999 // Include all
});

// Combine valid item IDs
console.log('\nStep 2: Creating filtered item_mods...\n');
const validItemIds = new Set([...equipmentIds, ...weaponIds]);
createTestItemMods(validItemIds);

console.log('\n✅ Test data files created!');
console.log(`Output directory: ${TEST_PATH}`);
console.log('\nTest files created:');
console.log('  - test_001_item_basic.sql (100 items)');
console.log('  - test_002_item_equipment.sql (50 items)');
console.log('  - test_003_item_weapon.sql (30 items)');
console.log('  - test_004_weapon_skills.sql (all 209 weapon skills)');
console.log('  - test_005_item_mods.sql (filtered mods for test items)');
console.log('\nNext: Run migrations/020_import_airskyboat_data.sql to test the import');
