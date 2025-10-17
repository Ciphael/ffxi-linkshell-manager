const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Sample items to verify (mix of different types)
const itemsToVerify = [
    'hecatomb_mittens',
    'koenig_handschuhs',
    'kaiser_handschuhs',
    'blood_finger_gauntlets',
    'crimson_greaves',
    'zephyr',
    'byakkos_haidate',
    'abyss_burgeonet_+1',
    'abyss_cuirass_+1'
];

async function fetchWikiHTML(itemName) {
    // Convert database name to wiki name
    let wikiName = itemName
        .split('_')
        .map((word, index) => {
            if (index === 0 || !['of', 'the'].includes(word)) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
        })
        .join('_');

    wikiName = wikiName.replace(/'/g, '%27');

    const url = `https://ffxiclopedia.fandom.com/wiki/${wikiName}`;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return { html: response.data, url };
    } catch (error) {
        return null;
    }
}

function extractWikiLines(html) {
    const $ = cheerio.load(html);
    const statisticsHeading = $('#Statistics').parent();

    if (statisticsHeading.length === 0) return [];

    const lines = [];
    const tableContainer = statisticsHeading.nextAll('div').filter((i, elem) => {
        const style = $(elem).attr('style') || '';
        return style.includes('display:table');
    }).first();

    const tableCells = tableContainer.find('div[style*="display:table-cell"]');
    let statsTableCell = tableCells.length > 1 ? tableCells.eq(1) : tableCells.first();

    if (statsTableCell.length > 0) {
        const childCount = statsTableCell.children('div').length;

        if (childCount === 1) {
            const nestedContainer = statsTableCell.children('div').first();
            const nestedChildCount = nestedContainer.children('div').length;

            if (nestedChildCount > 1) {
                statsTableCell = nestedContainer;
            }
        }

        statsTableCell.children('div').each((i, childDiv) => {
            if (i === 0) return; // Skip item name

            const text = $(childDiv).text().trim();
            if (text) {
                // Count how many lines this div represents on wiki
                const divHtml = $(childDiv).html();
                const brCount = (divHtml.match(/<br\s*\/?>/gi) || []).length;
                lines.push({
                    text,
                    lineCount: brCount + 1
                });
            }
        });
    }

    return lines;
}

async function getScrapedLines(itemName) {
    const result = await pool.query(`
        SELECT iwt.tooltip_lines
        FROM item_wiki_tooltips iwt
        JOIN item_basic ib ON ib.itemid = iwt.item_id
        WHERE ib.name = $1
    `, [itemName]);

    if (result.rows.length === 0) return null;

    // tooltip_lines is already parsed as JSON by PostgreSQL
    const tooltipLines = result.rows[0].tooltip_lines;
    return Array.isArray(tooltipLines) ? tooltipLines : JSON.parse(tooltipLines);
}

(async () => {
    try {
        console.log('=== WIKI VS DATABASE VERIFICATION ===\n');

        let totalChecked = 0;
        let perfect = 0;
        let issues = 0;

        for (const itemName of itemsToVerify) {
            console.log(`\n========================================`);
            console.log(`Item: ${itemName}`);
            console.log(`========================================\n`);

            const wikiData = await fetchWikiHTML(itemName);
            if (!wikiData) {
                console.log('❌ Could not fetch wiki page\n');
                continue;
            }

            console.log(`Wiki URL: ${wikiData.url}\n`);

            const wikiLines = extractWikiLines(wikiData.html);
            const scrapedLines = await getScrapedLines(itemName);

            if (!scrapedLines) {
                console.log('❌ No scraped data in database\n');
                issues++;
                totalChecked++;
                continue;
            }

            // Calculate expected line count from wiki
            const expectedLineCount = wikiLines.reduce((sum, item) => sum + item.lineCount, 0);
            const actualLineCount = scrapedLines.length;

            console.log(`Wiki structure: ${wikiLines.length} divs → ${expectedLineCount} expected lines`);
            console.log(`Scraped lines: ${actualLineCount}\n`);

            if (expectedLineCount === actualLineCount) {
                console.log('✅ LINE COUNT MATCHES\n');
                perfect++;
            } else {
                console.log(`❌ LINE COUNT MISMATCH! Expected ${expectedLineCount}, got ${actualLineCount}\n`);
                issues++;
            }

            console.log('Wiki structure:');
            wikiLines.forEach((line, idx) => {
                console.log(`  Div ${idx}: "${line.text.substring(0, 60)}..." (${line.lineCount} line(s))`);
            });

            console.log(`\nScraped lines:`);
            scrapedLines.forEach((line, idx) => {
                console.log(`  ${idx}: ${line}`);
            });

            totalChecked++;

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\n========================================`);
        console.log(`VERIFICATION SUMMARY`);
        console.log(`========================================`);
        console.log(`Total checked: ${totalChecked}`);
        console.log(`✅ Perfect: ${perfect}`);
        console.log(`❌ Issues: ${issues}`);
        console.log(`Accuracy: ${(perfect / totalChecked * 100).toFixed(1)}%`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
