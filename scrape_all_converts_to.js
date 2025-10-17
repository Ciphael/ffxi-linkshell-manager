const fs = require('fs');
require('dotenv').config();

// Load the scraping functions
const scriptContent = fs.readFileSync(__dirname + '/populate_sky_wiki_tooltips.js', 'utf8');
eval(scriptContent.split('// Main execution')[0]);

(async () => {
    try {
        console.log('=== Scraping ALL Converts-To Items ===\n');

        // Load the list of items
        const itemsData = JSON.parse(fs.readFileSync('all_converts_to_items.json', 'utf8'));
        const missingTooltips = itemsData.filter(item => item.tooltip_status === 'NO TOOLTIP');

        console.log(`Total items: ${itemsData.length}`);
        console.log(`Missing tooltips: ${missingTooltips.length}`);
        console.log(`Already have tooltips: ${itemsData.length - missingTooltips.length}\n`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        const startTime = Date.now();

        for (let i = 0; i < missingTooltips.length; i++) {
            const item = missingTooltips[i];
            const progress = `[${i + 1}/${missingTooltips.length}]`;

            if (i > 0 && i % 100 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = i / (elapsed / 1000);
                const remaining = (missingTooltips.length - i) / rate;
                console.log(`\n>>> Progress: ${progress} - ${rate.toFixed(1)} items/sec - ETA: ${(remaining / 60).toFixed(1)} min\n`);
            }

            console.log(`${progress} ${item.item_name}`);

            const wikiName = dbNameToWikiName(item.item_name);

            try {
                const wikiData = await scrapeWikiPage(wikiName);

                if (wikiData && (wikiData.tooltipLines.length > 0 || wikiData.description || wikiData.hiddenEffects.length > 0)) {
                    await insertWikiTooltip(item.itemid, wikiData);
                    console.log(`  ✅ ${wikiData.tooltipLines.length} lines, ${wikiData.hiddenEffects.length} hidden\n`);
                    successCount++;
                } else {
                    console.log(`  ⚠️  No data\n`);
                    skippedCount++;
                }
            } catch (error) {
                console.log(`  ❌ ${error.message}\n`);
                failCount++;
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const totalTime = (Date.now() - startTime) / 1000 / 60;

        console.log('\n=== FINAL SUMMARY ===');
        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️  Skipped: ${skippedCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`Total: ${missingTooltips.length}`);
        console.log(`Time: ${totalTime.toFixed(1)} minutes`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
