const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Manual mappings for Adaman → Armada and Koenig → Kaiser
// These are NOT +1/+2/+3 versions, they're separate upgrade items
const MANUAL_MAPPINGS = [
    // Adaman → Armada (Dynamis-Bastok upgrades)
    { base: 'adaman_barbuta', enhanced: 'armada_celata' },
    { base: 'adaman_hauberk', enhanced: 'armada_hauberk' },
    { base: 'adaman_mufflers', enhanced: 'armada_mufflers' },
    { base: 'adaman_breeches', enhanced: 'armada_breeches' },
    { base: 'adaman_sollerets', enhanced: 'armada_sollerets' },

    // Koenig → Kaiser (Martial abjuration upgrades)
    { base: 'koenig_schaller', enhanced: 'kaiser_schaller' },
    { base: 'koenig_cuirass', enhanced: 'kaiser_cuirass' },
    { base: 'koenig_handschuhs', enhanced: 'kaiser_handschuhs' },
    { base: 'koenig_diechlings', enhanced: 'kaiser_diechlings' },
    { base: 'koenig_schuhs', enhanced: 'kaiser_schuhs' }
];

(async () => {
    try {
        console.log('Populating Adaman→Armada and Koenig→Kaiser enhanced relationships...\n');

        for (const mapping of MANUAL_MAPPINGS) {
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

        console.log('\n✓ All Adaman/Koenig enhanced relationships populated!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
