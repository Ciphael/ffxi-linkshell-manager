const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check how many non-gear mob drops still need descriptions
        const result = await pool.query(`
            SELECT COUNT(*) as count
            FROM item_basic ib
            JOIN mob_droplist md ON ib.itemid = md.itemid
            LEFT JOIN item_text it ON ib.itemid = it.itemid
            LEFT JOIN item_equipment ie ON ib.itemid = ie."itemId"
            LEFT JOIN item_weapon iw ON ib.itemid = iw."itemId"
            WHERE (it.itemid IS NULL OR it.description IS NULL OR length(it.description) = 0)
              AND ie."itemId" IS NULL  -- Exclude equipment
              AND iw."itemId" IS NULL  -- Exclude weapons
              AND ib.name NOT LIKE '%scroll_of%'
        `);

        console.log(`\nItems still needing descriptions: ${result.rows[0].count}`);

        if (result.rows[0].count > 0) {
            console.log(`\nNext batch will scrape up to 500 items from this pool.`);
        } else {
            console.log(`\nAll non-gear mob drops have been processed!`);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
