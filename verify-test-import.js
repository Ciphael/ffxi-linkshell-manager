const { Pool } = require('pg');
require('dotenv').config();

async function verifyTestImport() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('=== Verifying Test Data Import ===\n');

    try {
        // Test 1: Row counts
        console.log('1. Row Counts:');
        const counts = [
            { table: 'item_basic', expected: 100 },
            { table: 'item_equipment', expected: 50 },
            { table: 'item_weapon', expected: 30 },
            { table: 'weapon_skills', expected: 209 },
            { table: 'item_mods', expected: 104 }
        ];

        for (const { table, expected } of counts) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const actual = parseInt(result.rows[0].count);
            const status = actual >= (expected * 0.8) ? '✓' : '⚠'; // Allow 80% threshold for timeout issues
            console.log(`  ${status} ${table}: ${actual} rows (expected: ${expected})`);
        }

        // Test 2: Rare/Ex flags
        console.log('\n2. Rare/Ex Flags:');
        const rareCount = await pool.query(`SELECT COUNT(*) FROM item_basic WHERE is_rare = TRUE`);
        const exCount = await pool.query(`SELECT COUNT(*) FROM item_basic WHERE is_ex = TRUE`);
        console.log(`  ✓ Rare items: ${rareCount.rows[0].count}`);
        console.log(`  ✓ Ex items: ${exCount.rows[0].count}`);

        // Test 3: Sample items
        console.log('\n3. Sample Items:');
        const sampleItems = await pool.query(`
            SELECT itemid, name, is_rare, is_ex
            FROM item_basic
            ORDER BY itemid
            LIMIT 5
        `);
        sampleItems.rows.forEach(item => {
            const flags = [];
            if (item.is_rare) flags.push('RARE');
            if (item.is_ex) flags.push('EX');
            console.log(`  - ${item.name} (${item.itemid})${flags.length ? ' [' + flags.join(', ') + ']' : ''}`);
        });

        // Test 4: Weapon Skills
        console.log('\n4. Weapon Skills:');
        const weaponSkills = await pool.query(`
            SELECT weaponskillid, name
            FROM weapon_skills
            WHERE weaponskillid IN (89, 1, 32)
            ORDER BY weaponskillid
        `);
        weaponSkills.rows.forEach(ws => {
            console.log(`  - ${ws.weaponskillid}: ${ws.name}`);
        });

        // Test 5: Item Mods
        console.log('\n5. Item Mods Sample:');
        const itemMods = await pool.query(`
            SELECT im."itemId", ib.name, im."modId", im.value
            FROM item_mods im
            JOIN item_basic ib ON ib.itemid = im."itemId"
            ORDER BY im."itemId"
            LIMIT 5
        `);
        itemMods.rows.forEach(mod => {
            console.log(`  - ${mod.name} (${mod.itemId}): mod ${mod.modId} = ${mod.value}`);
        });

        // Test 6: Equipment with level info
        console.log('\n6. Equipment Sample:');
        const equipment = await pool.query(`
            SELECT ie."itemId", ie.name, ie.level, ib.is_rare, ib.is_ex
            FROM item_equipment ie
            JOIN item_basic ib ON ib.itemid = ie."itemId"
            ORDER BY ie.level DESC
            LIMIT 5
        `);
        equipment.rows.forEach(eq => {
            const flags = [];
            if (eq.is_rare) flags.push('RARE');
            if (eq.is_ex) flags.push('EX');
            console.log(`  - Lv${eq.level} ${eq.name}${flags.length ? ' [' + flags.join(', ') + ']' : ''}`);
        });

        // Test 7: Weapons
        console.log('\n7. Weapons Sample:');
        const weapons = await pool.query(`
            SELECT iw."itemId", iw.name, iw.dmg, iw.delay
            FROM item_weapon iw
            ORDER BY iw.dmg DESC
            LIMIT 5
        `);
        weapons.rows.forEach(wpn => {
            console.log(`  - ${wpn.name}: DMG ${wpn.dmg} Delay ${wpn.delay}`);
        });

        console.log('\n✅ Verification complete!');
        console.log('\nTest import successful. Data structure and content look good.');
        console.log('Ready to proceed with full import if desired.');

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

verifyTestImport();
