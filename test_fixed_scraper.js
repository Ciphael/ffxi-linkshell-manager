const fs = require('fs');

// Load the scraping functions
const scriptContent = fs.readFileSync(__dirname + '/populate_sky_wiki_tooltips.js', 'utf8');
eval(scriptContent.split('// Main execution')[0]);

(async () => {
    try {
        console.log('=== Testing Fixed Scraper ===\n');

        const testItems = ['Koenig_Handschuhs', 'Kaiser_Handschuhs', 'Blood_Finger_Gauntlets'];

        for (const wikiName of testItems) {
            console.log(`\n=== ${wikiName} ===`);
            const wikiData = await scrapeWikiPage(wikiName);

            if (wikiData) {
                console.log(`Scraped ${wikiData.tooltipLines.length} lines:`);
                wikiData.tooltipLines.forEach((line, idx) => {
                    console.log(`  ${idx}: ${line}`);
                });

                const formatted = applyFormattingRules(wikiData.tooltipLines);
                console.log(`\nAfter formatting:`);
                formatted.forEach((line, idx) => {
                    console.log(`  ${idx}: ${line}`);
                });
            } else {
                console.log('  No data found');
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
