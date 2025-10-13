const fs = require('fs');
const path = require('path');
const readline = require('readline');

const AIRSKYBOAT_PATH = 'C:\\users\\roger\\desktop\\AirSkyBoat\\sql';
const OUTPUT_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';

async function convertItemMods() {
    console.log('=== Converting item_mods.sql (Large File) ===\n');
    console.log('Step 1: Loading valid item IDs from converted files...');

    // Load all valid item IDs from equipment and weapons
    const validItemIds = new Set();

    // Parse item_equipment to get valid IDs
    const equipmentContent = fs.readFileSync(path.join(OUTPUT_PATH, '002_item_equipment.sql'), 'utf8');
    const equipmentMatches = equipmentContent.matchAll(/INSERT INTO "item_equipment" VALUES \((\d+),/g);
    for (const match of equipmentMatches) {
        validItemIds.add(parseInt(match[1]));
    }

    // Parse item_weapon to get valid IDs
    const weaponContent = fs.readFileSync(path.join(OUTPUT_PATH, '003_item_weapon.sql'), 'utf8');
    const weaponMatches = weaponContent.matchAll(/INSERT INTO "item_weapon" VALUES \((\d+),/g);
    for (const match of weaponMatches) {
        validItemIds.add(parseInt(match[1]));
    }

    console.log(`  ✓ Loaded ${validItemIds.size} valid item IDs`);
    console.log('\nStep 2: Processing item_mods.sql (this may take a minute)...');

    const inputPath = path.join(AIRSKYBOAT_PATH, 'item_mods.sql');
    const outputPath = path.join(OUTPUT_PATH, '005_item_mods.sql');

    const fileStream = fs.createReadStream(inputPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let outputLines = [];
    let totalLines = 0;
    let keptLines = 0;
    let skippedLines = 0;
    let inInsertBlock = false;

    // Add header
    outputLines.push('-- Converted from AirSkyBoat MySQL to PostgreSQL');
    outputLines.push('-- Source: item_mods.sql');
    outputLines.push('-- Filtered: Only items with level < 76');
    outputLines.push('-- Date: ' + new Date().toISOString());
    outputLines.push('');
    outputLines.push('DROP TABLE IF EXISTS "item_mods";');
    outputLines.push('CREATE TABLE "item_mods" (');
    outputLines.push('  "itemId" INTEGER NOT NULL,');
    outputLines.push('  "modId" SMALLINT NOT NULL,');
    outputLines.push('  "value" SMALLINT NOT NULL,');
    outputLines.push('  PRIMARY KEY ("itemId", "modId")');
    outputLines.push(');');
    outputLines.push('');

    for await (const line of rl) {
        totalLines++;

        // Skip comments and MySQL-specific lines
        if (!line.trim() || line.startsWith('--') || line.match(/^\/\*/) || line.match(/^LOCK/) || line.match(/^UNLOCK/) || line.match(/^ALTER TABLE/)) {
            continue;
        }

        // Skip CREATE TABLE and other DDL
        if (line.match(/CREATE TABLE/i) || line.match(/DROP TABLE/i)) {
            continue;
        }

        // Process INSERT statements
        if (line.startsWith('INSERT INTO')) {
            inInsertBlock = true;

            // Extract itemId from INSERT statement
            // Format: INSERT INTO `item_mods` VALUES (itemId,modId,value);
            const match = line.match(/INSERT INTO [`"]item_mods[`"] VALUES \((\d+),(\d+),(-?\d+)\);/);

            if (match) {
                const [, itemId, modId, value] = match;
                const itemIdInt = parseInt(itemId);

                // Only keep mods for valid items
                if (validItemIds.has(itemIdInt)) {
                    // Convert to PostgreSQL format
                    const pgLine = `INSERT INTO "item_mods" VALUES (${itemId}, ${modId}, ${value});`;
                    outputLines.push(pgLine);
                    keptLines++;

                    // Write in batches to avoid memory issues
                    if (outputLines.length >= 10000) {
                        fs.appendFileSync(outputPath, outputLines.join('\n') + '\n', 'utf8');
                        outputLines = [];
                    }
                } else {
                    skippedLines++;
                }
            }
        }

        // Progress indicator every 10000 lines
        if (totalLines % 10000 === 0) {
            process.stdout.write(`\r  Progress: ${totalLines} lines processed, ${keptLines} kept, ${skippedLines} skipped`);
        }
    }

    // Write remaining lines
    if (outputLines.length > 0) {
        fs.appendFileSync(outputPath, outputLines.join('\n') + '\n', 'utf8');
    }

    console.log(`\n\n  ✓ Processed ${totalLines} total lines`);
    console.log(`  ✓ Kept ${keptLines} item_mods entries`);
    console.log(`  ✓ Skipped ${skippedLines} entries (items filtered out)`);
    console.log(`  ✓ Output: 005_item_mods.sql`);
    console.log('\n✅ item_mods conversion complete!');
}

convertItemMods().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
