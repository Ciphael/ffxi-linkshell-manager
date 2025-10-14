const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Special naming mappings for enhanced items
const SPECIAL_MAPPINGS = {
    'crimson': 'blood',
    'adaman': 'armada',
    'koenig': 'kaiser'
};

(async () => {
    try {
        console.log('Clearing previous enhanced IDs...\n');

        // Clear all enhanced IDs first
        await pool.query(`
            UPDATE item_classifications
            SET enhanced_1_id = NULL, enhanced_2_id = NULL, enhanced_3_id = NULL
        `);

        console.log('✓ Cleared previous data\n');

        // Get all items at once for lookups
        const allItems = await pool.query(`
            SELECT itemid, name FROM item_basic
        `);

        // Create a name->id lookup map
        const itemMap = {};
        allItems.rows.forEach(item => {
            itemMap[item.name] = item.itemid;
        });

        console.log(`Loaded ${allItems.rows.length} items\n`);
        console.log('Finding enhanced versions that ACTUALLY EXIST...\n');

        // For each base item, find if enhanced versions exist
        const updates = [];

        for (const [baseName, baseId] of Object.entries(itemMap)) {
            // Skip if this IS already an enhanced version
            if (baseName.includes('_+')) continue;

            // Check for enhanced versions (including special name mappings)
            const enhancedSearchNames = [baseName]; // Standard name

            // Check if base name needs special mapping for enhanced versions
            for (const [standard, enhanced] of Object.entries(SPECIAL_MAPPINGS)) {
                if (baseName.includes(standard)) {
                    const enhancedBaseName = baseName.replace(standard, enhanced);
                    enhancedSearchNames.push(enhancedBaseName);
                }
            }

            // Check for +1, +2, +3 for all possible names
            for (const searchName of enhancedSearchNames) {
                for (let level = 1; level <= 3; level++) {
                    const enhancedName = `${searchName}_+${level}`;

                    if (itemMap[enhancedName]) {
                        updates.push({
                            baseId: baseId,
                            enhancedId: itemMap[enhancedName],
                            level: level,
                            baseName: baseName,
                            enhancedName: enhancedName
                        });

                        console.log(`✓ Found: ${baseName} -> ${enhancedName}`);
                    }
                }
            }
        }

        console.log(`\nFound ${updates.length} valid enhanced item relationships\n`);

        // Execute all updates in batches
        const BATCH_SIZE = 100;
        let completed = 0;

        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (update) => {
                const columnName = `enhanced_${update.level}_id`;

                // Insert or update item_classifications record
                await pool.query(`
                    INSERT INTO item_classifications (item_id, classification, ${columnName})
                    VALUES ($1, 'Vendor Trash', $2)
                    ON CONFLICT (item_id)
                    DO UPDATE SET ${columnName} = $2
                `, [update.baseId, update.enhancedId]);
            }));

            completed += batch.length;
            if (completed % 100 === 0 || completed === updates.length) {
                console.log(`Progress: ${completed}/${updates.length}`);
            }
        }

        console.log(`\n✓ Successfully populated ${updates.length} enhanced item relationships!`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
