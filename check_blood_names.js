const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check what the API returns for blood gear
        const result = await pool.query(`
            SELECT
                ib.itemid as item_id,
                COALESCE(ie.name, iw.name, ib.name) as item_name,
                it.log_name as display_name
            FROM item_basic ib
            LEFT JOIN item_equipment ie ON ib.itemid = ie."itemId"
            LEFT JOIN item_weapon iw ON ib.itemid = iw."itemId"
            LEFT JOIN item_text it ON ib.itemid = it.itemid
            WHERE ib.name ILIKE '%blood%finger%'
            ORDER BY ib.name
        `);

        console.log('Blood Finger Gauntlets in database:\n');
        result.rows.forEach(row => {
            console.log(`ID: ${row.item_id}`);
            console.log(`  item_name (full): ${row.item_name}`);
            console.log(`  display_name (abbreviated): ${row.display_name}`);
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
