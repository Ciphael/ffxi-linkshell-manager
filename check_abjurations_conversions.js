const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Checking all abjurations and their conversions...\n');

        const result = await pool.query(`
            SELECT
                ib.itemid,
                ib.name as abjuration_name,
                ic.converts_to_item_id,
                ib2.name as converts_to_name,
                ic.enhanced_1_id as converts_to_enhanced_1,
                ib3.name as enhanced_1_name
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            LEFT JOIN item_basic ib2 ON ic.converts_to_item_id = ib2.itemid
            LEFT JOIN item_basic ib3 ON ic.enhanced_1_id = ib3.itemid
            WHERE ib.name ILIKE '%abjuration%'
            ORDER BY ib.name
        `);

        console.log(`Found ${result.rows.length} abjurations:\n`);

        result.rows.forEach(row => {
            console.log(`Abjuration: ${row.abjuration_name} (ID: ${row.itemid})`);
            if (row.converts_to_item_id) {
                console.log(`  → Converts to: ${row.converts_to_name} (ID: ${row.converts_to_item_id})`);
                if (row.converts_to_enhanced_1) {
                    console.log(`  → Enhanced +1: ${row.enhanced_1_name} (ID: ${row.converts_to_enhanced_1})`);
                }
            } else {
                console.log(`  ✗ NO CONVERSION SET`);
            }
            console.log('');
        });

        // Check specifically for Crimson/Blood gear
        console.log('\n=== Checking Crimson vs Blood gear ===\n');

        const crimson = await pool.query(`
            SELECT itemid, name FROM item_basic
            WHERE name ILIKE '%crimson%'
            ORDER BY name
        `);

        console.log(`Crimson items (${crimson.rows.length}):`);
        crimson.rows.forEach(r => console.log(`  ${r.name} (${r.itemid})`));

        const blood = await pool.query(`
            SELECT itemid, name FROM item_basic
            WHERE name ILIKE '%blood%'
            ORDER BY name
        `);

        console.log(`\nBlood items (${blood.rows.length}):`);
        blood.rows.forEach(r => console.log(`  ${r.name} (${r.itemid})`));

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
