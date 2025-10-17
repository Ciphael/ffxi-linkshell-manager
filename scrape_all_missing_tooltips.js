const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Load the scraping functions from populate_sky_wiki_tooltips.js
const scriptContent = fs.readFileSync(__dirname + '/populate_sky_wiki_tooltips.js', 'utf8');
eval(scriptContent.split('// Main execution')[0]);

// Main execution
(async () => {
    try {
        console.log('=== Finding ALL Items Missing Tooltips ===\n');

        // Query 1: Find all converts_to items that don't have tooltips
        const convertsToResult = await pool.query(`
            SELECT DISTINCT
                ib.itemid,
                ib.name as item_name,
                'converts_to' as source
            FROM item_basic ib
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE iwt.item_id IS NULL
            AND (
                ib.name IN (
                    SELECT DISTINCT ie.converts_to_hq1 FROM item_equipment ie WHERE ie.converts_to_hq1 IS NOT NULL
                    UNION
                    SELECT DISTINCT ie.converts_to_hq2 FROM item_equipment ie WHERE ie.converts_to_hq2 IS NOT NULL
                    UNION
                    SELECT DISTINCT ie.converts_to_hq3 FROM item_equipment ie WHERE ie.converts_to_hq3 IS NOT NULL
                )
            )
        `);

        console.log(`Found ${convertsToResult.rows.length} converts_to items without tooltips\n`);

        // Query 2: Get specific problem items the user mentioned
        const specificItems = [
            'blood_finger_gauntlets', 'blood_finger_gauntlets_+1',
            'crimson_greaves', 'crimson_greaves_+1',
            'blood_greaves', 'blood_greaves_+1',
            'shura_kote', 'shura_kote_+1',
            'koenig_handschuhs', 'koenig_handschuhs_+1',
            'kaiser_handschuhs', 'kaiser_handschuhs_+1',
            'crimson_finger_gauntlets', 'crimson_finger_gauntlets_+1',
            'crimson_cuisses', 'crimson_cuisses_+1'
        ];

        const specificResult = await pool.query(`
            SELECT DISTINCT
                ib.itemid,
                ib.name as item_name,
                'user_mentioned' as source
            FROM item_basic ib
            WHERE ib.name = ANY($1::text[])
        `, [specificItems]);

        console.log(`Found ${specificResult.rows.length} user-mentioned items\n`);

        // Combine and deduplicate
        const allItems = [...convertsToResult.rows, ...specificResult.rows];
        const uniqueItems = Array.from(new Map(allItems.map(item => [item.itemid, item])).values());

        console.log(`Total unique items to scrape: ${uniqueItems.length}\n`);
        console.log('Items to scrape:');
        uniqueItems.forEach(item => {
            console.log(`  ${item.itemid}: ${item.item_name} (${item.source})`);
        });

        // Now scrape each item
        console.log('\n=== Starting Scraping ===\n');

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < uniqueItems.length; i++) {
            const item = uniqueItems[i];
            const progress = `[${i + 1}/${uniqueItems.length}]`;

            console.log(`${progress} ${item.item_name}`);

            const wikiName = dbNameToWikiName(item.item_name);
            console.log(`  Wiki: ${wikiName}`);

            try {
                const wikiData = await scrapeWikiPage(wikiName);

                if (wikiData && (wikiData.tooltipLines.length > 0 || wikiData.description || wikiData.hiddenEffects.length > 0)) {
                    console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines, ${wikiData.hiddenEffects.length} hidden effects`);

                    await insertWikiTooltip(item.itemid, wikiData);
                    console.log('  ✅ Inserted into database\n');
                    successCount++;
                } else {
                    console.log('  ⚠️  No tooltip data found\n');
                    skippedCount++;
                }
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}\n`);
                failCount++;
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('=== SUMMARY ===');
        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️  Skipped: ${skippedCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`Total: ${uniqueItems.length}`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
