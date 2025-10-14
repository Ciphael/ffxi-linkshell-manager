const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Clear descriptions for all items that are equipment or weapons
        const result = await pool.query(`
            UPDATE item_text it
            SET description = NULL
            FROM (
                SELECT DISTINCT ib.itemid
                FROM item_basic ib
                LEFT JOIN item_equipment ie ON ib.itemid = ie."itemId"
                LEFT JOIN item_weapon iw ON ib.itemid = iw."itemId"
                WHERE ie."itemId" IS NOT NULL OR iw."itemId" IS NOT NULL
            ) gear
            WHERE it.itemid = gear.itemid
              AND it.description IS NOT NULL
        `);

        console.log(`Cleared descriptions for ${result.rowCount} gear items (equipment/weapons)`);
        console.log('These items will only show stats/images, no flavor text.');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
