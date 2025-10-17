require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    const result = await pool.query(`
        SELECT itemid, name
        FROM item_basic
        WHERE name LIKE '%zephyr%'
        ORDER BY name
    `);

    console.log(`Found ${result.rows.length} items with 'zephyr':\n`);
    result.rows.forEach(r => {
        console.log(`  ${r.itemid}: ${r.name}`);
    });

    await pool.end();
})();
