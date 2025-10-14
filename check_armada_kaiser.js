const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Checking if Armada items exist:\n');
        const armadaQuery = await pool.query(`
            SELECT itemid, name
            FROM item_basic
            WHERE name ILIKE '%armada%'
            ORDER BY name
        `);

        if (armadaQuery.rows.length === 0) {
            console.log('No Armada items found in database!');
        } else {
            armadaQuery.rows.forEach(row => {
                console.log(`${row.itemid}: ${row.name}`);
            });
        }

        console.log('\n\nChecking if Kaiser items exist:\n');
        const kaiserQuery = await pool.query(`
            SELECT itemid, name
            FROM item_basic
            WHERE name ILIKE '%kaiser%'
            ORDER BY name
        `);

        if (kaiserQuery.rows.length === 0) {
            console.log('No Kaiser items found in database!');
        } else {
            kaiserQuery.rows.forEach(row => {
                console.log(`${row.itemid}: ${row.name}`);
            });
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
