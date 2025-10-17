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

// Items the user explicitly mentioned as having problems
const problemItems = [
    // User Issue 1: Stats cramming
    'koenig_handschuhs', 'koenig_handschuhs_+1',
    'kaiser_handschuhs', 'kaiser_handschuhs_+1',

    // User Issue 2: Text running outside panel
    'crimson_greaves', 'crimson_greaves_+1',
    'blood_greaves', 'blood_greaves_+1',

    // User Issue 4: Missing/wrong hidden effects
    'crimson_finger_gauntlets', 'crimson_finger_gauntlets_+1',
    'blood_finger_gauntlets', 'blood_finger_gauntlets_+1',

    // User Issue 5: Nonsense Mod242+2
    'shura_kote', 'shura_kote_+1',

    // Related items that might also need scraping
    'crimson_cuisses', 'crimson_cuisses_+1',
    'koenig_cuirass', 'koenig_cuirass_+1',
    'koenig_diechlings', 'koenig_diechlings_+1',
    'kaiser_schaller', 'kaiser_schaller_+1',
    'blood_cuisses', 'blood_cuisses_+1',

    // Re-scrape Zephyr for duplicate hidden effect fix
    'zephyr_mantle'
];

// Main execution
(async () => {
    try {
        console.log('=== Scraping Problem Items with Fixed Parser ===\n');

        // Get items from database
        const result = await pool.query(`
            SELECT itemid, name as item_name
            FROM item_basic
            WHERE name = ANY($1::text[])
            ORDER BY name
        `, [problemItems]);

        console.log(`Found ${result.rows.length}/${problemItems.length} items in database\n`);

        if (result.rows.length < problemItems.length) {
            const foundNames = result.rows.map(r => r.item_name);
            const missing = problemItems.filter(name => !foundNames.includes(name));
            console.log(`Missing items: ${missing.join(', ')}\n`);
        }

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
                    console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines, ${wikiData.hiddenEffects.length} hidden effects`);

                    // Show the actual scraped data for verification
                    if (wikiData.tooltipLines.length > 0) {
                        console.log(`  Lines: ${wikiData.tooltipLines.slice(0, 5).join(' | ')}`);
                    }
                    if (wikiData.hiddenEffects.length > 0) {
                        console.log(`  Hidden: ${wikiData.hiddenEffects.join(' | ')}`);
                    }

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
        console.log(`Total: ${result.rows.length}`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
