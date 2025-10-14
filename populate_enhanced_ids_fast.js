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
        console.log('Populating enhanced item IDs (fast batch mode)...\n');

        // Get ALL items at once for lookups
        const allItems = await pool.query(`
            SELECT itemid, name FROM item_basic
        `);

        // Create a name->id lookup map
        const itemMap = {};
        allItems.rows.forEach(item => {
            itemMap[item.name] = item.itemid;
        });

        console.log(`Loaded ${allItems.rows.length} items into memory\n`);

        // Get all enhanced items
        const enhancedItems = await pool.query(`
            SELECT itemid, name
            FROM item_basic
            WHERE name LIKE '%\\_+1'
               OR name LIKE '%\\_+2'
               OR name LIKE '%\\_+3'
            ORDER BY name
        `);

        console.log(`Found ${enhancedItems.rows.length} enhanced items to process\n`);

        // Build all updates in memory first
        const updates = [];

        for (const item of enhancedItems.rows) {
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

            // Check if this base name has a special mapping
            let standardBaseName = baseName;
            for (const [standard, enhanced] of Object.entries(SPECIAL_MAPPINGS)) {
                if (baseName.includes(enhanced)) {
                    standardBaseName = baseName.replace(enhanced, standard);
                    break;
                }
            }

            // Look up base item in memory
            const baseItemId = itemMap[standardBaseName];

            if (baseItemId) {
                updates.push({
                    baseItemId,
                    enhancedItemId: item.itemid,
                    level: enhancementLevel,
                    baseName: standardBaseName,
                    enhancedName: item.name
                });
            }
        }

        console.log(`Prepared ${updates.length} updates\n`);

        // Execute all updates in batches
        const BATCH_SIZE = 100;
        let completed = 0;

        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (update) => {
                const columnName = `enhanced_${update.level}_id`;
                await pool.query(`
                    UPDATE item_classifications
                    SET ${columnName} = $1
                    WHERE item_id = $2
                `, [update.enhancedItemId, update.baseItemId]);
            }));

            completed += batch.length;
            console.log(`Progress: ${completed}/${updates.length} (${Math.round(completed/updates.length*100)}%)`);
        }

        console.log(`\n✓ Successfully updated ${updates.length} enhanced item relationships!`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
