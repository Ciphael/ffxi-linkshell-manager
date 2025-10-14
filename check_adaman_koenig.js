const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Checking Adaman enhanced relationships:\n');
        const adamanQuery = await pool.query(`
            SELECT
                ib.name as base_name,
                ib1.name as enhanced_1,
                ib2.name as enhanced_2,
                ib3.name as enhanced_3
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            LEFT JOIN item_basic ib1 ON ic.enhanced_1_id = ib1.itemid
            LEFT JOIN item_basic ib2 ON ic.enhanced_2_id = ib2.itemid
            LEFT JOIN item_basic ib3 ON ic.enhanced_3_id = ib3.itemid
            WHERE ib.name ILIKE 'adaman%'
            ORDER BY ib.name
        `);

        adamanQuery.rows.forEach(row => {
            console.log(`${row.base_name}:`);
            console.log(`  +1: ${row.enhanced_1 || 'none'}`);
            console.log(`  +2: ${row.enhanced_2 || 'none'}`);
            console.log(`  +3: ${row.enhanced_3 || 'none'}`);
            console.log('');
        });

        console.log('\nChecking Koenig enhanced relationships:\n');
        const koenigQuery = await pool.query(`
            SELECT
                ib.name as base_name,
                ib1.name as enhanced_1,
                ib2.name as enhanced_2,
                ib3.name as enhanced_3
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            LEFT JOIN item_basic ib1 ON ic.enhanced_1_id = ib1.itemid
            LEFT JOIN item_basic ib2 ON ic.enhanced_2_id = ib2.itemid
            LEFT JOIN item_basic ib3 ON ic.enhanced_3_id = ib3.itemid
            WHERE ib.name ILIKE 'koenig%'
            ORDER BY ib.name
        `);

        koenigQuery.rows.forEach(row => {
            console.log(`${row.base_name}:`);
            console.log(`  +1: ${row.enhanced_1 || 'none'}`);
            console.log(`  +2: ${row.enhanced_2 || 'none'}`);
            console.log(`  +3: ${row.enhanced_3 || 'none'}`);
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
