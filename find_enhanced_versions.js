const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Get all convertible items and their base conversion targets
        const result = await pool.query(`
            SELECT
                ic.item_name as abjuration_name,
                ic.converts_to_item_name as base_item_name,
                ic.converts_to_item_id as base_item_id
            FROM item_classifications ic
            WHERE ic.convertible = TRUE
            ORDER BY ic.converts_to_item_name
        `);

        console.log('=== Finding Enhanced Versions ===\n');

        for (const row of result.rows) {
            // Look for enhanced versions (Blood, Hydra, Shura +1, etc.)
            const baseName = row.base_item_name;

            // Try different naming patterns for enhanced versions
            const enhancedPatterns = [
                baseName + ' +1',  // Standard +1 notation
                baseName.replace('Crimson', 'Blood'),  // Crimson -> Blood
                baseName.replace('Hecatomb', 'Hecatomb') + ' +1',  // Hecatomb +1
                baseName.replace('Shura', 'Shura') + ' +1',  // Shura +1
                baseName.replace('Zenith', 'Zenith') + ' +1',  // Zenith +1
                baseName.replace('Koenig', 'Koenig') + ' +1',  // Koenig +1
                baseName.replace('Adaman', 'Adaman') + ' +1',  // Adaman +1
                baseName.replace('Dalmatica', 'Dalmatica') + ' +1',  // Dalmatica +1
            ];

            // Query for each pattern
            for (const pattern of enhancedPatterns) {
                const searchResult = await pool.query(`
                    SELECT itemid, name
                    FROM item_basic
                    WHERE LOWER(name) = LOWER($1)
                    LIMIT 1
                `, [pattern.toLowerCase().replace(/ /g, '_')]);

                if (searchResult.rows.length > 0) {
                    console.log(`${row.abjuration_name}:`);
                    console.log(`  Base: ${baseName} (${row.base_item_id})`);
                    console.log(`  Enhanced: ${searchResult.rows[0].name} (${searchResult.rows[0].itemid})`);
                    console.log('');
                    break;
                }
            }
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
