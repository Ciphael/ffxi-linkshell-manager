const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check if zenith_crown and crimson items are in item_classifications
        const result = await pool.query(`
            SELECT
                ib.itemid,
                ib.name,
                ic.item_id,
                ic.enhanced_1_id,
                ic.enhanced_2_id,
                ic.enhanced_3_id
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            WHERE ib.name IN ('zenith_crown', 'crimson_finger_gauntlets', 'blood_finger_gauntlets')
            ORDER BY ib.name
        `);

        console.log('Item Classification Table Check:\n');
        result.rows.forEach(r => {
            console.log(`Item: ${r.name} (ID: ${r.itemid})`);
            console.log(`  In item_classifications: ${r.item_id ? 'YES' : 'NO'}`);
            if (r.item_id) {
                console.log(`  enhanced_1_id: ${r.enhanced_1_id}`);
                console.log(`  enhanced_2_id: ${r.enhanced_2_id}`);
                console.log(`  enhanced_3_id: ${r.enhanced_3_id}`);
            }
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
