const fs = require('fs');
require('dotenv').config();

// Load the scraping functions
const scriptContent = fs.readFileSync(__dirname + '/populate_sky_wiki_tooltips.js', 'utf8');
eval(scriptContent.split('// Main execution')[0]);

(async () => {
    try {
        console.log('=== Re-scraping Zephyr for Duplicate Hidden Effects Fix ===\n');

        const wikiName = dbNameToWikiName('zephyr');
        console.log(`Wiki: ${wikiName}`);

        const wikiData = await scrapeWikiPage(wikiName);

        if (wikiData && (wikiData.tooltipLines.length > 0 || wikiData.description || wikiData.hiddenEffects.length > 0)) {
            console.log(`✓ Scraped ${wikiData.tooltipLines.length} tooltip lines, ${wikiData.hiddenEffects.length} hidden effects`);

            console.log('\nTooltip lines:');
            wikiData.tooltipLines.forEach((line, idx) => {
                console.log(`  ${idx}: ${line}`);
            });

            console.log('\nHidden effects:');
            wikiData.hiddenEffects.forEach((effect, idx) => {
                console.log(`  ${idx}: ${effect}`);
            });

            await insertWikiTooltip(18163, wikiData);
            console.log('\n✅ Inserted into database');
        } else {
            console.log('⚠️  No tooltip data found');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
