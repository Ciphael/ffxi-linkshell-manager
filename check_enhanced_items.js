const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check Zenith Crown and its enhanced versions
        const result = await pool.query(`
            SELECT
                ib.itemid,
                ib.name as item_name,
                ic.enhanced_1_id,
                ic.enhanced_2_id,
                ic.enhanced_3_id,
                ib2.name as enhanced_1_name,
                ib3.name as enhanced_2_name,
                ib4.name as enhanced_3_name
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            LEFT JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
            LEFT JOIN item_basic ib3 ON ic.enhanced_2_id = ib3.itemid
            LEFT JOIN item_basic ib4 ON ic.enhanced_3_id = ib4.itemid
            WHERE ib.name LIKE '%zenith_crown%'
               OR ib.name LIKE '%crimson%gauntlets%'
               OR ib.name LIKE '%blood%gauntlets%'
            ORDER BY ib.name
        `);

        console.log('Enhanced Item Test Results:\n');
        console.log(`Total items found: ${result.rows.length}\n`);

        result.rows.forEach(r => {
            console.log(`Item: ${r.item_name} (ID: ${r.itemid})`);
            console.log(`  Enhanced +1 ID: ${r.enhanced_1_id} -> ${r.enhanced_1_name || 'NOT FOUND'}`);
            console.log(`  Enhanced +2 ID: ${r.enhanced_2_id} -> ${r.enhanced_2_name || 'NOT FOUND'}`);
            console.log(`  Enhanced +3 ID: ${r.enhanced_3_id} -> ${r.enhanced_3_name || 'NOT FOUND'}`);
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
