const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../ffxi-linkshell-manager/.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Convert item name from database format to wiki URL format
// Example: "divine_log" -> "Divine_Log"
function itemNameToWikiUrl(dbName) {
    return dbName.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('_');
}

// Extract description from wiki HTML
function extractDescription(html) {
    // Pattern: <div><b>Item Name</b></div><div>Description here<br />with newlines</div>
    // Use a more flexible pattern that captures everything in the description div
    const regex = /<div><b>[^<]+<\/b><\/div><div>([^<]*(?:<br\s*\/>[^<]*)*)<\/div>/i;
    const match = html.match(regex);

    if (match && match[1]) {
        let description = match[1];

        // Convert <br /> tags to newlines
        description = description.replace(/<br\s*\/?>/gi, '\n');

        // Decode HTML entities
        description = description
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

        return description.trim();
    }

    return null;
}

// Fetch wiki page for an item
function fetchWikiPage(itemName) {
    return new Promise((resolve, reject) => {
        const wikiUrl = itemNameToWikiUrl(itemName);
        const url = `https://ffxiclopedia.fandom.com/wiki/${wikiUrl}`;

        https.get(url, (res) => {
            if (res.statusCode === 404) {
                resolve({ itemName, description: null, status: 'not_found' });
                return;
            }

            if (res.statusCode !== 200) {
                resolve({ itemName, description: null, status: `http_${res.statusCode}` });
                return;
            }

            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const description = extractDescription(data);
                resolve({
                    itemName,
                    description,
                    status: description ? 'found' : 'no_description',
                    wikiUrl: url
                });
            });
        }).on('error', (err) => {
            reject({ itemName, error: err.message });
        });
    });
}

// Scrape descriptions with rate limiting
async function scrapeDescriptions(items, concurrency = 2, delayMs = 500) {
    const results = {
        found: 0,
        no_description: 0,
        not_found: 0,
        errors: 0
    };

    const descriptions = [];

    console.log(`Starting wiki scrape of ${items.length} items...`);
    console.log(`Concurrency: ${concurrency}, Delay: ${delayMs}ms\n`);

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const promises = batch.map(item => fetchWikiPage(item.name));

        try {
            const batchResults = await Promise.allSettled(promises);

            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    const data = result.value;
                    results[data.status]++;

                    if (data.status === 'found') {
                        descriptions.push({
                            itemid: items.find(it => it.name === data.itemName).itemid,
                            name: data.itemName,
                            description: data.description,
                            source: 'wiki'
                        });
                    }
                } else {
                    results.errors++;
                    console.error(`\nError: ${result.reason}`);
                }
            });

            const progress = Math.min(i + concurrency, items.length);
            process.stdout.write(`\rProgress: ${progress}/${items.length} | Found: ${results.found} | Not found: ${results.not_found} | No desc: ${results.no_description} | Errors: ${results.errors}`);

        } catch (err) {
            results.errors++;
            console.error(`\nBatch error: ${err}`);
        }

        // Rate limiting delay
        if (i + concurrency < items.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log('\n\n=== Scrape Complete ===');
    console.log(`Found: ${results.found}`);
    console.log(`No description: ${results.no_description}`);
    console.log(`Not found: ${results.not_found}`);
    console.log(`Errors: ${results.errors}`);

    return descriptions;
}

// Main execution
(async () => {
    try {
        // Get non-equipment items without descriptions (mob drops prioritized)
        // Skip equipment since those are managed by SQL files with structured stat data
        const result = await pool.query(`
            SELECT DISTINCT ib.itemid, ib.name
            FROM item_basic ib
            JOIN mob_droplist md ON ib.itemid = md.itemid
            LEFT JOIN item_text it ON ib.itemid = it.itemid
            LEFT JOIN item_equipment ie ON ib.itemid = ie."itemId"
            LEFT JOIN item_weapon iw ON ib.itemid = iw."itemId"
            WHERE (it.itemid IS NULL OR it.description IS NULL OR length(it.description) = 0)
              AND ie."itemId" IS NULL  -- Exclude equipment
              AND iw."itemId" IS NULL  -- Exclude weapons
              AND ib.name NOT LIKE '%scroll_of%'
            ORDER BY ib.itemid
            LIMIT 500
        `);

        console.log(`Found ${result.rows.length} items to scrape from wiki\n`);

        if (result.rows.length === 0) {
            console.log('No items need scraping!');
            await pool.end();
            return;
        }

        const descriptions = await scrapeDescriptions(result.rows);

        // Save to JSON file
        const outputPath = path.join(__dirname, 'wiki_descriptions.json');
        fs.writeFileSync(outputPath, JSON.stringify(descriptions, null, 2), 'utf8');

        console.log(`\nSaved ${descriptions.length} descriptions to: ${outputPath}`);

        // Show samples
        console.log('\n=== Sample Descriptions ===');
        descriptions.slice(0, 5).forEach(item => {
            console.log(`\n[${item.itemid}] ${item.name}:`);
            console.log(`  "${item.description}"`);
        });

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
