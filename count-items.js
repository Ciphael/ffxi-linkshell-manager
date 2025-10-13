const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function countItems() {
    try {
        const equipCount = await pool.query('SELECT COUNT(*) as total FROM item_equipment');
        const weaponCount = await pool.query('SELECT COUNT(*) as total FROM item_weapon');

        console.log('\n=== ITEM COUNTS ===');
        console.log(`Equipment items: ${equipCount.rows[0].total}`);
        console.log(`Weapon items: ${weaponCount.rows[0].total}`);
        console.log(`Total items: ${parseInt(equipCount.rows[0].total) + parseInt(weaponCount.rows[0].total)}`);

        // Sample a few items to see their structure
        console.log('\n=== SAMPLE EQUIPMENT ===');
        const equipSample = await pool.query('SELECT itemid, name, level, slot FROM item_equipment LIMIT 3');
        console.log(equipSample.rows);

        console.log('\n=== SAMPLE WEAPONS ===');
        const weaponSample = await pool.query('SELECT itemid, name, skill, dmg, delay FROM item_weapon LIMIT 3');
        console.log(weaponSample.rows);

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

countItems();
