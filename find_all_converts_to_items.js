require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Find ALL unique converts_to items from item_classifications table
        const result = await pool.query(`
            SELECT DISTINCT
                ib.itemid,
                ib.name as item_name,
                CASE
                    WHEN iwt.item_id IS NULL THEN 'NO TOOLTIP'
                    ELSE 'HAS TOOLTIP'
                END as tooltip_status
            FROM (
                SELECT DISTINCT item_id FROM (
                    SELECT enhanced_1_id as item_id FROM item_classifications WHERE enhanced_1_id IS NOT NULL
                    UNION
                    SELECT enhanced_2_id as item_id FROM item_classifications WHERE enhanced_2_id IS NOT NULL
                    UNION
                    SELECT enhanced_3_id as item_id FROM item_classifications WHERE enhanced_3_id IS NOT NULL
                    UNION
                    SELECT converts_to_item_id as item_id FROM item_classifications WHERE converts_to_item_id IS NOT NULL
                ) AS all_converts
            ) AS converts
            JOIN item_basic ib ON ib.itemid = converts.item_id
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            ORDER BY tooltip_status, ib.name
        `);

        console.log(`Found ${result.rows.length} total converts_to items\n`);

        const noTooltip = result.rows.filter(r => r.tooltip_status === 'NO TOOLTIP');
        const hasTooltip = result.rows.filter(r => r.tooltip_status === 'HAS TOOLTIP');

        console.log(`Items WITHOUT tooltips: ${noTooltip.length}`);
        console.log(`Items WITH tooltips: ${hasTooltip.length}\n`);

        if (noTooltip.length > 0) {
            console.log('=== ITEMS MISSING TOOLTIPS ===');
            noTooltip.forEach(r => {
                console.log(`  ${r.itemid}: ${r.item_name}`);
            });
        }

        // Save all converts_to items to file for scraping
        const fs = require('fs');
        fs.writeFileSync(
            'all_converts_to_items.json',
            JSON.stringify(result.rows, null, 2)
        );

        console.log(`\nSaved all items to all_converts_to_items.json`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
