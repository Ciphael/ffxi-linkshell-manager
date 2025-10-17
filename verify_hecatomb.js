const fs = require('fs');
require('dotenv').config();

// Load the scraping functions
const scriptContent = fs.readFileSync(__dirname + '/populate_sky_wiki_tooltips.js', 'utf8');
eval(scriptContent.split('// Main execution')[0]);

(async () => {
    try {
        console.log('=== Verifying Hecatomb Mittens ===\n');

        const wikiName = dbNameToWikiName('hecatomb_mittens');
        console.log(`Wiki: ${wikiName}\n`);

        const wikiData = await scrapeWikiPage(wikiName);

        if (wikiData) {
            console.log(`Scraped ${wikiData.tooltipLines.length} lines:\n`);
            wikiData.tooltipLines.forEach((line, idx) => {
                console.log(`  ${idx}: ${line}`);
            });

            if (wikiData.hiddenEffects.length > 0) {
                console.log(`\nHidden effects:`);
                wikiData.hiddenEffects.forEach((effect, idx) => {
                    console.log(`  ${idx}: ${effect}`);
                });
            }

            const formatted = applyFormattingRules(wikiData.tooltipLines);
            console.log(`\nAfter formatting:`);
            formatted.forEach((line, idx) => {
                console.log(`  ${idx}: ${line}`);
            });
        } else {
            console.log('No data found');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
