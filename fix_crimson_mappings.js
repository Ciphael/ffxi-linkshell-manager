const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Fixing Crimson -> Blood mappings...\n');

        // Manual mapping for all Crimson items
        const crimsonMappings = [
            { crimson: 'Crimson Mask', blood: 'blood_mask' },
            { crimson: 'Crimson Scale Mail', blood: 'blood_scale_mail' },
            { crimson: 'Crimson Finger Gauntlets', blood: 'blood_finger_gauntlets' },
            { crimson: 'Crimson Cuisses', blood: 'blood_cuisses' },
            { crimson: 'Crimson Greaves', blood: 'blood_greaves' }
        ];

        for (const mapping of crimsonMappings) {
            // Get the Blood item info
            const bloodItem = await pool.query(`
                SELECT itemid, name
                FROM item_basic
                WHERE name = $1
            `, [mapping.blood]);

            if (bloodItem.rows.length > 0) {
                // Format the display name properly
                const displayName = bloodItem.rows[0].name
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                // Update the item_classifications
                const result = await pool.query(`
                    UPDATE item_classifications
                    SET enhanced_item_id = $1,
                        enhanced_item_name = $2
                    WHERE converts_to_item_name = $3
                      AND convertible = TRUE
                `, [bloodItem.rows[0].itemid, displayName, mapping.crimson]);

                console.log(`✓ ${mapping.crimson} -> ${displayName} (${bloodItem.rows[0].itemid}) - ${result.rowCount} rows updated`);
            } else {
                console.log(`✗ ${mapping.crimson} - Blood version not found!`);
            }
        }

        console.log('\n=== Verification ===');
        const verification = await pool.query(`
            SELECT converts_to_item_name, enhanced_item_name, enhanced_item_id
            FROM item_classifications
            WHERE convertible = TRUE
              AND converts_to_item_name LIKE 'Crimson%'
            ORDER BY converts_to_item_name
        `);

        verification.rows.forEach(row => {
            console.log(`${row.converts_to_item_name} -> ${row.enhanced_item_name || '(not mapped)'}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
