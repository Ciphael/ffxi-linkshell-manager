const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Crimson → Blood (Dynamis enhanced +1)
const CRIMSON_BLOOD_MAPPINGS = [
    { base: 'crimson_mask', enhanced: 'blood_mask' },
    { base: 'crimson_scale_mail', enhanced: 'blood_scale_mail' },
    { base: 'crimson_finger_gauntlets', enhanced: 'blood_finger_gauntlets' },
    { base: 'crimson_cuisses', enhanced: 'blood_cuisses' },
    { base: 'crimson_greaves', enhanced: 'blood_greaves' }
];

(async () => {
    try {
        console.log('Populating Crimson → Blood enhanced relationships...\n');

        for (const mapping of CRIMSON_BLOOD_MAPPINGS) {
            // Get base item ID
            const baseResult = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [mapping.base]
            );

            // Get enhanced item ID
            const enhancedResult = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [mapping.enhanced]
            );

            if (baseResult.rows.length === 0) {
                console.log(`✗ Base item not found: ${mapping.base}`);
                continue;
            }

            if (enhancedResult.rows.length === 0) {
                console.log(`✗ Enhanced item not found: ${mapping.enhanced}`);
                continue;
            }

            const baseId = baseResult.rows[0].itemid;
            const enhancedId = enhancedResult.rows[0].itemid;

            // Insert or update the enhanced_1_id relationship
            await pool.query(`
                INSERT INTO item_classifications (item_id, classification, enhanced_1_id)
                VALUES ($1, 'Vendor Trash', $2)
                ON CONFLICT (item_id)
                DO UPDATE SET enhanced_1_id = $2
            `, [baseId, enhancedId]);

            console.log(`✓ ${mapping.base} (${baseId}) → ${mapping.enhanced} (${enhancedId})`);
        }

        console.log('\n✓ All Crimson/Blood enhanced relationships populated!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
