const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Finding all converts_to item IDs...\n');

        // Get all unique converts_to_item_id values from mob_droplist
        const result = await pool.query(`
            SELECT DISTINCT converts_to_item_id as itemid
            FROM mob_droplist
            WHERE converts_to_item_id IS NOT NULL
            UNION
            SELECT DISTINCT enhanced_1_id as itemid
            FROM mob_droplist
            WHERE enhanced_1_id IS NOT NULL
            UNION
            SELECT DISTINCT enhanced_2_id as itemid
            FROM mob_droplist
            WHERE enhanced_2_id IS NOT NULL
        `);

        console.log(`Found ${result.rows.length} unique converts_to/enhanced items\n`);

        // Get item names for these IDs
        const itemIds = result.rows.map(r => r.itemid).filter(id => id != null);

        if (itemIds.length > 0) {
            const itemsResult = await pool.query(`
                SELECT DISTINCT
                    ib.itemid,
                    ib.name as item_name
                FROM item_basic ib
                WHERE ib.itemid = ANY($1)
                ORDER BY ib.name
            `, [itemIds]);

            console.log('Items to scrape:');
            itemsResult.rows.forEach(item => {
                console.log(`  ${item.itemid}: ${item.item_name}`);
            });

            // Save to file for the scraper
            const fs = require('fs');
            fs.writeFileSync(
                'converts_to_items.json',
                JSON.stringify(itemsResult.rows, null, 2)
            );
            console.log(`\nSaved ${itemsResult.rows.length} items to converts_to_items.json`);
        }

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
