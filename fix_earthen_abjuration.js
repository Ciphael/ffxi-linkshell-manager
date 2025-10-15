require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Fixing earthen_abjuration_head mapping...\n');

        // Get the item_id for earthen_abjuration_head
        const abjResult = await pool.query(`
            SELECT item_id FROM item_classifications
            WHERE item_name = 'earthen_abjuration_head'
        `);

        if (abjResult.rows.length > 0) {
            const itemId = abjResult.rows[0].item_id;

            // Update converts_to_item_id to point to adaman_celata (12429)
            // And set enhanced_1_id to armada_celata (13924)
            await pool.query(`
                UPDATE item_classifications
                SET converts_to_item_id = 12429,
                    enhanced_1_id = 13924
                WHERE item_id = $1
            `, [itemId]);

            console.log('✅ Updated earthen_abjuration_head:');
            console.log('   OLD: converts_to_item_id = 12420 (adaman_barbuta) ❌');
            console.log('   NEW: converts_to_item_id = 12429 (adaman_celata) ✅');
            console.log('   NEW: enhanced_1_id = 13924 (armada_celata +1) ✅\n');

            // Verify the change
            const verify = await pool.query(`
                SELECT
                    ic.item_name,
                    ic.converts_to_item_id,
                    ic.enhanced_1_id,
                    ib1.name as base_item,
                    ib2.name as enhanced_item
                FROM item_classifications ic
                LEFT JOIN item_basic ib1 ON ic.converts_to_item_id = ib1.itemid
                LEFT JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
                WHERE ic.item_name = 'earthen_abjuration_head'
            `);

            console.log('Verification:');
            console.log(JSON.stringify(verify.rows, null, 2));
        } else {
            console.log('❌ earthen_abjuration_head not found in database');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
