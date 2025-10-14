const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Special naming mappings for enhanced items
const SPECIAL_MAPPINGS = {
    'crimson': 'blood',
    'adaman': 'adamantine',
    'koenig': 'kaiser'
};

(async () => {
    try {
        console.log('Populating enhanced item IDs...\n');

        // Get all items that have +1, +2, or +3 versions
        const items = await pool.query(`
            SELECT itemid, name
            FROM item_basic
            WHERE name LIKE '%\\_+1'
               OR name LIKE '%\\_+2'
               OR name LIKE '%\\_+3'
            ORDER BY name
        `);

        console.log(`Found ${items.rows.length} enhanced items to process\n`);

        let updated = 0;
        let notFound = 0;

        for (const item of items.rows) {
            // Determine enhancement level
            let enhancementLevel = 0;
            let baseName = item.name;

            if (item.name.endsWith('_+1')) {
                enhancementLevel = 1;
                baseName = item.name.replace(/_\+1$/, '');
            } else if (item.name.endsWith('_+2')) {
                enhancementLevel = 2;
                baseName = item.name.replace(/_\+2$/, '');
            } else if (item.name.endsWith('_+3')) {
                enhancementLevel = 3;
                baseName = item.name.replace(/_\+3$/, '');
            }

            // Check if this base name has a special mapping (Blood -> Crimson, etc.)
            let standardBaseName = baseName;
            for (const [standard, enhanced] of Object.entries(SPECIAL_MAPPINGS)) {
                // If this is the enhanced version (blood), find the standard version (crimson)
                if (baseName.includes(enhanced)) {
                    standardBaseName = baseName.replace(enhanced, standard);
                    break;
                }
            }

            // Find the standard (non-enhanced) version
            const baseItem = await pool.query(`
                SELECT itemid FROM item_basic WHERE name = $1
            `, [standardBaseName]);

            if (baseItem.rows.length > 0) {
                const baseItemId = baseItem.rows[0].itemid;
                const columnName = `enhanced_${enhancementLevel}_id`;

                // Update the standard item to point to this enhanced version
                await pool.query(`
                    UPDATE item_classifications
                    SET ${columnName} = $1
                    WHERE item_id = $2
                `, [item.itemid, baseItemId]);

                console.log(`✓ ${standardBaseName} -> ${item.name} (${columnName} = ${item.itemid})`);
                updated++;
            } else {
                console.log(`✗ Base item not found for: ${item.name} (looking for: ${standardBaseName})`);
                notFound++;
            }
        }

        console.log(`\n✓ Updated ${updated} enhanced item relationships`);
        console.log(`✗ Could not find base item for ${notFound} enhanced items`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
