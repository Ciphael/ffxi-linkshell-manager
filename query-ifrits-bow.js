const { Pool } = require('pg');
require('dotenv').config();

async function queryIfritsBow() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('=== Ifrit\'s Bow Details ===\n');

    try {
        // Search for Ifrit's Bow
        const search = await pool.query(`
            SELECT itemid, name FROM item_basic
            WHERE LOWER(name) LIKE '%ifrit%bow%'
            OR LOWER(name) LIKE '%ifrits%bow%'
        `);

        if (search.rows.length === 0) {
            console.log('❌ Ifrit\'s Bow not found in test data');
            console.log('\nNote: Test data only contains 80 items. Ifrit\'s Bow may not be included.');
            console.log('Checking item count in full converted data...\n');

            // Check if it exists in the full converted files
            const fs = require('fs');
            const path = require('path');
            const basicPath = path.join('C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql', '001_item_basic.sql');
            const content = fs.readFileSync(basicPath, 'utf8');

            const matches = content.match(/INSERT INTO.*'[^']*ifrit[^']*bow[^']*'/gi);
            if (matches && matches.length > 0) {
                console.log('✓ Found in full converted data:');
                matches.forEach(match => console.log('  ' + match.substring(0, 150) + '...'));
                console.log('\n⚠️ This item will be available after full import.');
            } else {
                console.log('❌ Item not found in converted data either.');
            }

            await pool.end();
            return;
        }

        const itemId = search.rows[0].itemid;
        console.log(`Found: ${search.rows[0].name} (ID: ${itemId})\n`);

        // Get basic info
        const basic = await pool.query(`
            SELECT * FROM item_basic WHERE itemid = $1
        `, [itemId]);

        // Get equipment info (if exists)
        const equipment = await pool.query(`
            SELECT * FROM item_equipment WHERE "itemId" = $1
        `, [itemId]);

        // Get weapon info (if exists)
        const weapon = await pool.query(`
            SELECT * FROM item_weapon WHERE "itemId" = $1
        `, [itemId]);

        // Get mods
        const mods = await pool.query(`
            SELECT "modId", value FROM item_mods WHERE "itemId" = $1
        `, [itemId]);

        // Display results
        const item = basic.rows[0];

        console.log('BASIC INFO:');
        console.log(`  Item ID: ${item.itemid}`);
        console.log(`  Name: ${item.name}`);
        console.log(`  Rare: ${item.is_rare ? 'YES' : 'NO'}`);
        console.log(`  Ex: ${item.is_ex ? 'YES' : 'NO'}`);
        console.log(`  Stack Size: ${item.stackSize}`);
        console.log(`  Base Sell Price: ${item.BaseSell} gil`);

        if (equipment.rows.length > 0) {
            const eq = equipment.rows[0];
            console.log('\nEQUIPMENT INFO:');
            console.log(`  Level: ${eq.level}`);
            console.log(`  Item Level: ${eq.ilevel}`);
            console.log(`  Slot: ${eq.slot}`);
            console.log(`  Jobs (bitfield): ${eq.jobs}`);
            console.log(`  Race: ${eq.race === 255 ? 'All Races' : eq.race}`);
        }

        if (weapon.rows.length > 0) {
            const wpn = weapon.rows[0];
            console.log('\nWEAPON INFO:');
            console.log(`  Weapon Type (skill): ${wpn.skill}`);
            console.log(`  Damage: ${wpn.dmg}`);
            console.log(`  Delay: ${wpn.delay}`);
            console.log(`  Damage Type: ${wpn.dmgType}`);
            console.log(`  Accuracy (hit): ${wpn.hit}`);
        }

        if (mods.rows.length > 0) {
            console.log('\nITEM MODS / ATTRIBUTES:');
            mods.rows.forEach(mod => {
                console.log(`  Mod ID ${mod.modId}: +${mod.value}`);
            });
        } else {
            console.log('\nITEM MODS / ATTRIBUTES: None');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

queryIfritsBow();
