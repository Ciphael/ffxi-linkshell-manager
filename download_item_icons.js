const https = require('https');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const OUTPUT_DIR = path.join(__dirname, '../ffxi-linkshell-manager-frontend/item-images');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Download a single icon
function downloadIcon(itemId) {
    return new Promise((resolve, reject) => {
        const url = `https://static.ffxiah.com/images/icon/${itemId}.png`;
        const outputPath = path.join(OUTPUT_DIR, `${itemId}.png`);

        // Skip if already downloaded
        if (fs.existsSync(outputPath)) {
            resolve({ itemId, status: 'cached' });
            return;
        }

        https.get(url, (res) => {
            if (res.statusCode === 200) {
                const fileStream = fs.createWriteStream(outputPath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve({ itemId, status: 'downloaded' });
                });

                fileStream.on('error', (err) => {
                    fs.unlink(outputPath, () => {});
                    reject({ itemId, error: err.message });
                });
            } else if (res.statusCode === 404) {
                resolve({ itemId, status: 'not_found' });
            } else {
                resolve({ itemId, status: `http_${res.statusCode}` });
            }
        }).on('error', (err) => {
            reject({ itemId, error: err.message });
        });
    });
}

// Download icons with rate limiting
async function downloadAllIcons(itemIds, concurrency = 5, delayMs = 100) {
    const results = {
        downloaded: 0,
        cached: 0,
        not_found: 0,
        errors: 0
    };

    console.log(`Starting download of ${itemIds.length} item icons...`);
    console.log(`Concurrency: ${concurrency}, Delay: ${delayMs}ms\n`);

    for (let i = 0; i < itemIds.length; i += concurrency) {
        const batch = itemIds.slice(i, i + concurrency);
        const promises = batch.map(id => downloadIcon(id));

        try {
            const batchResults = await Promise.all(promises);

            batchResults.forEach(result => {
                if (result.status === 'downloaded') results.downloaded++;
                else if (result.status === 'cached') results.cached++;
                else if (result.status === 'not_found') results.not_found++;
            });

            const progress = Math.min(i + concurrency, itemIds.length);
            process.stdout.write(`\rProgress: ${progress}/${itemIds.length} | Downloaded: ${results.downloaded} | Cached: ${results.cached} | Not found: ${results.not_found}`);

        } catch (err) {
            results.errors++;
            console.error(`\nError in batch: ${err}`);
        }

        // Rate limiting delay
        if (i + concurrency < itemIds.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log('\n\n=== Download Complete ===');
    console.log(`Downloaded: ${results.downloaded}`);
    console.log(`Cached: ${results.cached}`);
    console.log(`Not found: ${results.not_found}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Total icons: ${results.downloaded + results.cached}`);

    return results;
}

// Main execution
(async () => {
    try {
        // Get all unique item IDs from item_basic
        const result = await pool.query('SELECT DISTINCT itemid FROM item_basic ORDER BY itemid');
        const itemIds = result.rows.map(row => row.itemid);

        console.log(`Found ${itemIds.length} items in database`);

        await downloadAllIcons(itemIds);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
