const fs = require('fs');
const path = require('path');

// Configuration
const AIRSKYBOAT_PATH = 'C:\\users\\roger\\desktop\\AirSkyBoat\\sql';
const OUTPUT_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

// Item flag constants (from AirSkyBoat src/map/items/item.h)
const ITEM_FLAGS = {
    RARE: 0x8000,      // 32768 - bit 15
    EXCLUSIVE: 0x4000  // 16384 - bit 14
};

/**
 * Convert MySQL data types to PostgreSQL
 */
function convertDataTypes(line) {
    // Remove MySQL type specifications
    line = line.replace(/tinyint\(\d+\)\s+unsigned/gi, 'SMALLINT');
    line = line.replace(/smallint\(\d+\)\s+unsigned/gi, 'INTEGER');
    line = line.replace(/int\(\d+\)\s+unsigned/gi, 'BIGINT');
    line = line.replace(/tinyint\(\d+\)/gi, 'SMALLINT');
    line = line.replace(/smallint\(\d+\)/gi, 'INTEGER');
    line = line.replace(/int\(\d+\)/gi, 'INTEGER');
    line = line.replace(/tinytext/gi, 'TEXT');
    line = line.replace(/binary\(\d+\)/gi, 'BYTEA');

    return line;
}

/**
 * Remove MySQL-specific syntax
 */
function removeMySQLSyntax(line) {
    // Remove MySQL commands
    if (line.match(/^\/\*!.*\*\/;?$/)) return null; // MySQL comments
    if (line.match(/^LOCK TABLES/i)) return null;
    if (line.match(/^UNLOCK TABLES/i)) return null;
    if (line.match(/^ALTER TABLE.*DISABLE KEYS/i)) return null;
    if (line.match(/^ALTER TABLE.*ENABLE KEYS/i)) return null;
    if (line.match(/ENGINE=\w+/i)) {
        line = line.replace(/ENGINE=\w+/gi, '');
    }
    if (line.match(/DEFAULT CHARSET=\w+/i)) {
        line = line.replace(/DEFAULT CHARSET=\w+/gi, '');
    }
    if (line.match(/AVG_ROW_LENGTH=\d+/i)) {
        line = line.replace(/AVG_ROW_LENGTH=\d+/gi, '');
    }
    if (line.match(/PACK_KEYS=\d+/i)) {
        line = line.replace(/PACK_KEYS=\d+/gi, '');
    }
    if (line.match(/CHECKSUM=\d+/i)) {
        line = line.replace(/CHECKSUM=\d+/gi, '');
    }

    // Convert backticks to double quotes
    line = line.replace(/`([^`]+)`/g, '"$1"');

    // Convert MySQL hex notation (0x...) to PostgreSQL (\x...)
    line = line.replace(/0x([0-9a-fA-F]+)/g, "'\\\\x$1'");

    // Clean up multiple spaces and trailing commas before closing parenthesis
    line = line.replace(/,\s*\)/g, ')');
    line = line.replace(/\s+/g, ' ').trim();

    return line;
}

/**
 * Parse item flags and add rare/ex booleans to INSERT statement
 */
function parseItemBasicInsert(line) {
    // Match INSERT INTO `item_basic` VALUES (itemid,subid,name,sortname,stackSize,flags,...)
    const match = line.match(/INSERT INTO [`"]item_basic[`"] VALUES \((\d+),(\d+),'([^']+)','([^']+)',(\d+),(\d+),(\d+),(\d+),(\d+)\);/);

    if (!match) return line;

    const [, itemid, subid, name, sortname, stackSize, flags, aH, NoSale, BaseSell] = match;
    const flagsInt = parseInt(flags);
    const isRare = !!(flagsInt & ITEM_FLAGS.RARE);
    const isEx = !!(flagsInt & ITEM_FLAGS.EXCLUSIVE);

    // Enhanced INSERT with parsed flags
    return `INSERT INTO item_basic (itemid, subid, name, sortname, "stackSize", flags, "aH", "NoSale", "BaseSell", is_rare, is_ex) VALUES (${itemid}, ${subid}, '${name}', '${sortname}', ${stackSize}, ${flags}, ${aH}, ${NoSale}, ${BaseSell}, ${isRare}, ${isEx});`;
}

/**
 * Filter item_equipment by level
 */
function filterItemEquipment(line) {
    // Only process INSERT statements
    if (!line.startsWith('INSERT INTO')) return line;

    // Extract level from INSERT statement
    // Format: INSERT INTO `item_equipment` VALUES (itemId,'name',level,ilevel,...)
    const match = line.match(/INSERT INTO [`"]item_equipment[`"] VALUES \((\d+),'([^']*)',(\d+),(\d+),/);

    if (!match) return line;

    const [, itemId, name, level, ilevel] = match;
    const levelInt = parseInt(level);
    const ilevelInt = parseInt(ilevel);

    // Filter: level must be < 76 and ilevel must be 0
    if (levelInt >= 76 || ilevelInt > 0) {
        return null; // Skip this item
    }

    return line;
}

/**
 * Process a single SQL file
 */
function processFile(inputFile, outputFile, options = {}) {
    console.log(`Processing ${path.basename(inputFile)}...`);

    const inputPath = path.join(AIRSKYBOAT_PATH, inputFile);
    const outputPath = path.join(OUTPUT_PATH, outputFile);

    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');

    let outputLines = [];
    let skippedCount = 0;
    let processedCount = 0;

    // Add header
    outputLines.push('-- Converted from AirSkyBoat MySQL to PostgreSQL');
    outputLines.push(`-- Source: ${inputFile}`);
    outputLines.push(`-- Filters: ${JSON.stringify(options.filters || 'none')}`);
    outputLines.push('-- Date: ' + new Date().toISOString());
    outputLines.push('');

    for (let line of lines) {
        line = line.trim();

        // Skip empty lines and basic comments
        if (!line || line.startsWith('--') || line.startsWith('/*') && !line.startsWith('/*!')) {
            continue;
        }

        // Remove MySQL-specific syntax
        line = removeMySQLSyntax(line);
        if (line === null) continue;

        // Convert data types
        if (line.match(/CREATE TABLE/i)) {
            line = convertDataTypes(line);
        }

        // Apply specific processing based on table
        if (options.parseItemBasic && line.startsWith('INSERT INTO')) {
            line = parseItemBasicInsert(line);
        }

        if (options.filterEquipment && line.startsWith('INSERT INTO')) {
            line = filterItemEquipment(line);
            if (line === null) {
                skippedCount++;
                continue;
            }
        }

        if (line) {
            outputLines.push(line);
            if (line.startsWith('INSERT INTO')) {
                processedCount++;
            }
        }
    }

    // Write output
    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');

    console.log(`  ✓ Processed ${processedCount} inserts`);
    if (skippedCount > 0) {
        console.log(`  ✓ Filtered out ${skippedCount} items (level 76+ or ilevel > 0)`);
    }
    console.log(`  ✓ Output: ${outputFile}`);
    console.log('');
}

// Main conversion process
console.log('=== AirSkyBoat MySQL to PostgreSQL Converter ===\n');

// Convert item_basic (with rare/ex parsing)
console.log('[1/5] Converting item_basic.sql...');
processFile('item_basic.sql', '001_item_basic.sql', {
    parseItemBasic: true
});

// Convert item_equipment (with level filter)
console.log('[2/5] Converting item_equipment.sql (filtering level 76+)...');
processFile('item_equipment.sql', '002_item_equipment.sql', {
    filterEquipment: true,
    filters: { level: '<76', ilevel: '=0' }
});

// Convert item_weapon
console.log('[3/5] Converting item_weapon.sql...');
processFile('item_weapon.sql', '003_item_weapon.sql');

// Convert weapon_skills
console.log('[4/5] Converting weapon_skills.sql...');
processFile('weapon_skills.sql', '004_weapon_skills.sql');

// Note about item_mods - too large to convert in one go
console.log('[5/5] item_mods.sql is very large (79,773 lines)');
console.log('  This will be converted in batches in a separate script.');
console.log('');

console.log('✅ Conversion complete!');
console.log(`Output directory: ${OUTPUT_PATH}`);
console.log('\nNext steps:');
console.log('1. Review converted SQL files');
console.log('2. Run create-migration.js to generate migration file');
console.log('3. Test migration on sample data');
