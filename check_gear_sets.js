const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const homam = await pool.query('SELECT itemid, name FROM item_basic WHERE name ILIKE \'%homam%\' ORDER BY name');
        console.log('Homam items:');
        homam.rows.forEach(r => console.log(`  ${r.name} (${r.itemid})`));

        const nashira = await pool.query('SELECT itemid, name FROM item_basic WHERE name ILIKE \'%nashira%\' ORDER BY name');
        console.log('\nNashira items:');
        nashira.rows.forEach(r => console.log(`  ${r.name} (${r.itemid})`));

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
