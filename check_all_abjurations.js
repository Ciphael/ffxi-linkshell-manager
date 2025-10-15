require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const result = await pool.query(`
            SELECT
                ic.item_name,
                ic.converts_to_item_id,
                ib1.name as converts_to_name,
                ic.enhanced_1_id,
                ib2.name as enhanced_1_name
            FROM item_classifications ic
            LEFT JOIN item_basic ib1 ON ic.converts_to_item_id = ib1.itemid
            LEFT JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
            WHERE ic.item_name LIKE '%abjuration%'
            ORDER BY ic.item_name
        `);

        console.log('ALL ABJURATION MAPPINGS IN DATABASE:\n');
        console.log(`Found ${result.rows.length} abjurations\n`);

        result.rows.forEach(r => {
            console.log(`${r.item_name}:`);
            console.log(`  Converts: ${r.converts_to_name || 'NULL'}`);
            console.log(`  Enhanced: ${r.enhanced_1_name || 'NULL'}\n`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
