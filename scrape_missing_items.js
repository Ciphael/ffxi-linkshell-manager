const fs = require('fs');
const path = require('path');

// Load the populate_sky_wiki_tooltips.js functions
const scriptContent = fs.readFileSync(path.join(__dirname, 'populate_sky_wiki_tooltips.js'), 'utf8');

// Extract and execute the imports and function definitions
eval(scriptContent.split('// Main execution')[0]);

// Items that need scraping based on user issues
const itemsToScrape = [
    // Issue 1: Gem items
    { itemid: null, item_name: 'gem_of_the_east' },
    { itemid: null, item_name: 'gem_of_the_south' },
    { itemid: null, item_name: 'gem_of_the_west' },
    { itemid: null, item_name: 'gem_of_the_north' },

    // Issue 1: Libation/Oblation
    { itemid: null, item_name: 'libation_abjuration' },
    { itemid: null, item_name: 'oblation_abjuration' },

    // Issue 3: Zenith items (re-scrape to fix +2 issue)
    { itemid: null, item_name: 'zenith_crown' },
    { itemid: null, item_name: 'zenith_crown_+1' },
    { itemid: null, item_name: 'zenith_mitts' },
    { itemid: null, item_name: 'zenith_mitts_+1' },

    // Issue 4: Scarecrow scythe
    { itemid: null, item_name: 'scarecrow_scythe' },

    // Issue 5: Koenig/Kaiser handschuhs
    { itemid: null, item_name: 'koenig_handschuhs' },
    { itemid: null, item_name: 'kaiser_handschuhs' },
    { itemid: null, item_name: 'koenig_handschuhs_+1' },
    { itemid: null, item_name: 'kaiser_handschuhs_+1' },

    // Issue 9: Crimson gear
    { itemid: null, item_name: 'crimson_cuisses' },
    { itemid: null, item_name: 'crimson_cuisses_+1' },
    { itemid: null, item_name: 'crimson_finger_gauntlets' },
    { itemid: null, item_name: 'crimson_finger_gauntlets_+1' },
];

// Get item IDs from database and scrape
(async () => {
    try {
        console.log('=== Scraping Missing Items ===\n');

        // Get item IDs from database
        const names = itemsToScrape.map(i => i.item_name);
        const result = await pool.query(`
            SELECT itemid, name as item_name
            FROM item_basic
            WHERE name = ANY($1::text[])
            ORDER BY name
        `, [names]);

        console.log(`Found ${result.rows.length}/${itemsToScrape.length} items in database\n`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < result.rows.length; i++) {
            const item = result.rows[i];
            const progress = `[${i + 1}/${result.rows.length}]`;

            console.log(`${progress} ${item.item_name}`);

            const wikiName = dbNameToWikiName(item.item_name);
            console.log(`  Wiki: ${wikiName}`);

            try {
                const wikiData = await scrapeWikiPage(wikiName);

                if (wikiData && (wikiData.tooltipLines.length > 0 || wikiData.description || wikiData.hiddenEffects.length > 0)) {
                    console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines, description: ${wikiData.description ? 'Yes' : 'No'}`);

                    await insertWikiTooltip(item.itemid, wikiData);
                    console.log('  ✅ Inserted into database\n');
                    successCount++;
                } else {
                    console.log('  ⚠️  No tooltip data or description found\n');
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

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
