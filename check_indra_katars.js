const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const result = await pool.query(`
            SELECT
                ib.itemid,
                ib.name,
                it.description,
                CASE WHEN ie."itemId" IS NOT NULL THEN 'YES' ELSE 'NO' END as is_equipment,
                CASE WHEN iw."itemId" IS NOT NULL THEN 'YES' ELSE 'NO' END as is_weapon
            FROM item_basic ib
            LEFT JOIN item_text it ON ib.itemid = it.itemid
            LEFT JOIN item_equipment ie ON ib.itemid = ie."itemId"
            LEFT JOIN item_weapon iw ON ib.itemid = iw."itemId"
            WHERE ib.name LIKE '%indra%katar%'
        `);

        console.log('=== Indra Katars Items ===\n');
        result.rows.forEach(row => {
            console.log(`Item ID: ${row.itemid}`);
            console.log(`Name: ${row.name}`);
            console.log(`Is Equipment: ${row.is_equipment}`);
            console.log(`Is Weapon: ${row.is_weapon}`);
            console.log(`Description: ${row.description || '(none)'}`);
            console.log('---');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
