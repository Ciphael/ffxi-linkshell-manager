const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function importWikiDescriptions() {
    try {
        const descriptionsPath = path.join(__dirname, 'wiki_descriptions.json');
        const descriptions = JSON.parse(fs.readFileSync(descriptionsPath, 'utf8'));

        console.log(`Importing ${descriptions.length} wiki descriptions...\n`);

        let updated = 0;
        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of descriptions) {
            try {
                // CRITICAL: Check if this is equipment or weapon - skip if so
                // Gear items get their descriptions from SQL files with structured stat data
                const gearCheck = await pool.query(
                    `SELECT
                        EXISTS(SELECT 1 FROM item_equipment WHERE "itemId" = $1) as is_equipment,
                        EXISTS(SELECT 1 FROM item_weapon WHERE "itemId" = $1) as is_weapon
                    `,
                    [item.itemid]
                );

                if (gearCheck.rows[0].is_equipment || gearCheck.rows[0].is_weapon) {
                    skipped++;
                    process.stdout.write(`\rProgress: ${updated + inserted + skipped}/${descriptions.length} | Updated: ${updated} | Inserted: ${inserted} | Skipped: ${skipped} (gear) | Errors: ${errors}`);
                    continue;
                }

                // First try to update existing record
                const updateResult = await pool.query(
                    `UPDATE item_text
                     SET description = $1
                     WHERE itemid = $2`,
                    [item.description, item.itemid]
                );

                if (updateResult.rowCount > 0) {
                    updated++;
                } else {
                    // If no rows updated, insert new record
                    await pool.query(
                        `INSERT INTO item_text (itemid, internal_name, description)
                         SELECT $1, name, $2
                         FROM item_basic
                         WHERE itemid = $1`,
                        [item.itemid, item.description]
                    );
                    inserted++;
                }

                process.stdout.write(`\rProgress: ${updated + inserted + skipped}/${descriptions.length} | Updated: ${updated} | Inserted: ${inserted} | Skipped: ${skipped} (gear) | Errors: ${errors}`);

            } catch (err) {
                errors++;
                console.error(`\nError importing item ${item.itemid} (${item.name}): ${err.message}`);
            }
        }

        console.log('\n\n=== Import Complete ===');
        console.log(`Updated: ${updated}`);
        console.log(`Inserted: ${inserted}`);
        console.log(`Skipped (gear): ${skipped}`);
        console.log(`Errors: ${errors}`);

        // Show some sample results
        console.log('\n=== Sample Updated Items ===');
        const samples = await pool.query(`
            SELECT it.itemid, ib.name, it.description
            FROM item_text it
            JOIN item_basic ib ON it.itemid = ib.itemid
            WHERE it.itemid = ANY($1::int[])
            LIMIT 5
        `, [descriptions.slice(0, 5).map(d => d.itemid)]);

        samples.rows.forEach(row => {
            console.log(`\n[${row.itemid}] ${row.name}:`);
            console.log(`  "${row.description}"`);
        });

        await pool.end();

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

importWikiDescriptions();
