const { Pool } = require('pg');
require('dotenv').config();

async function debugColumns() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('=== Debugging Column Names and Values ===\n');

    try {
        console.log('1. Sample itemids from each table:\n');

        const basicIds = await pool.query(`SELECT itemid FROM item_basic ORDER BY itemid LIMIT 5`);
        console.log('item_basic.itemid:', basicIds.rows.map(r => r.itemid).join(', '));

        const equipIds = await pool.query(`SELECT "itemId" FROM item_equipment ORDER BY "itemId" LIMIT 5`);
        console.log('item_equipment."itemId":', equipIds.rows.map(r => r.itemId).join(', '));

        const weaponIds = await pool.query(`SELECT "itemId" FROM item_weapon ORDER BY "itemId" LIMIT 5`);
        console.log('item_weapon."itemId":', weaponIds.rows.map(r => r.itemId).join(', '));

        const modIds = await pool.query(`SELECT DISTINCT "itemId" FROM item_mods ORDER BY "itemId" LIMIT 5`);
        console.log('item_mods."itemId":', modIds.rows.map(r => r.itemId).join(', '));

        console.log('\n2. Check if equipment IDs exist in item_basic:\n');

        const checkIds = equipIds.rows.slice(0, 3);
        for (const row of checkIds) {
            const exists = await pool.query(`SELECT COUNT(*) FROM item_basic WHERE itemid = $1`, [row.itemId]);
            console.log(`  Equipment ${row.itemId}: ${exists.rows[0].count > 0 ? '✓ Found' : '❌ Not found'} in item_basic`);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

debugColumns();
