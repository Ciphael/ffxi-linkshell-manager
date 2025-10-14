const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test set: 4 items for initial testing
const TEST_ITEMS = [
    { db_name: 'byakkos_haidate', wiki_name: 'Byakko%27s_Haidate' },
    { db_name: 'genbus_kabuto', wiki_name: 'Genbu%27s_Kabuto' },
    { db_name: 'kirins_osode', wiki_name: 'Kirin%27s_Osode' },
    { db_name: 'byakkos_axe', wiki_name: 'Byakko%27s_Axe' }
];

// Clean text content from a div (preserve structure, remove HTML)
function cleanDivText($, elem) {
    let text = '';

    $(elem).contents().each((i, node) => {
        if (node.type === 'text') {
            const nodeText = $(node).text();
            text += nodeText;
            if (nodeText.match(/^[+\-]\d+$/)) {
                text += ' ';
            }
        } else if (node.type === 'tag') {
            const tagName = node.name;

            if (tagName === 'br') {
                text += ' ';
            } else if (tagName === 'img') {
                const alt = $(node).attr('alt');
                if (alt && alt.startsWith('Resistance to')) {
                    const element = alt.replace('Resistance to ', '').trim();
                    text += element + ' ';
                } else if (alt && alt.includes('Resistance')) {
                    const element = alt.replace(' Resistance', '').trim();
                    text += element + ' ';
                }
            } else if (tagName === 'a') {
                const title = $(node).attr('title');
                if (title && title.includes('Resistance')) {
                    const element = title.replace(' Resistance', '').trim();
                    text += element + ' ';
                } else {
                    const linkText = $(node).text();
                    if (linkText) {
                        text += linkText;
                    } else {
                        text += cleanDivText($, node);
                    }
                }
            } else if (tagName === 'b' || tagName === 'strong') {
                text += cleanDivText($, node);
            } else if (tagName === 'span') {
                const hasRareEx = $(node).find('img[alt="Rare"], img[alt="Exclusive"]').length > 0;
                if (!hasRareEx) {
                    text += cleanDivText($, node);
                }
            } else {
                text += cleanDivText($, node);
            }
        }
    });

    return text;
}

// Extract hidden effects from wiki page
function extractHiddenEffects($, statsTable) {
    const hiddenEffects = [];
    let nextElem = statsTable.next();
    let foundHidden = false;

    for (let i = 0; i < 5 && nextElem.length > 0; i++) {
        const text = nextElem.text();

        if (nextElem.is('h2, h3, h4')) {
            break;
        }

        if (text.includes('Hidden Effect')) {
            foundHidden = true;
        }

        if (foundHidden) {
            nextElem.find('li').each((j, li) => {
                const effectText = $(li).text().trim();
                if (effectText && !effectText.includes('Hidden Effect')) {
                    hiddenEffects.push(effectText);
                }
            });

            if (nextElem.is('ul, ol')) {
                nextElem.find('li').each((j, li) => {
                    const effectText = $(li).text().trim();
                    if (effectText && !effectText.includes('Hidden Effect')) {
                        hiddenEffects.push(effectText);
                    }
                });
            }

            if (foundHidden && nextElem.next().is('h2, h3, h4')) {
                break;
            }
        }

        nextElem = nextElem.next();
    }

    return hiddenEffects;
}

// Scrape wiki page and extract tooltip data
async function scrapeWikiPage(wikiName) {
    const url = `https://ffxiclopedia.fandom.com/wiki/${wikiName}`;
    console.log(`  Fetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const statisticsHeading = $('#Statistics').parent();

        if (statisticsHeading.length === 0) {
            console.log('  ❌ No Statistics section found');
            return null;
        }

        const tooltipLines = [];
        let hiddenEffects = [];
        let description = '';

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

            // Extract tooltip lines
            statsTableCell.children('div').each((i, childDiv) => {
                if (i === 0) return; // Skip item name

                const divHtml = $(childDiv).html();
                if (divHtml && divHtml.includes('<br')) {
                    const parts = divHtml.split(/<br\s*\/?>/i);
                    parts.forEach((part) => {
                        const $part = $('<div>').html(part);
                        const partText = cleanDivText($, $part.get(0)).trim();
                        if (partText) {
                            tooltipLines.push(partText);
                        }
                    });
                } else {
                    const fullText = cleanDivText($, childDiv).trim();
                    if (fullText) {
                        const cleanedLine = fullText.replace(/\s+/g, ' ').trim();
                        tooltipLines.push(cleanedLine);
                    }
                }
            });

            hiddenEffects = extractHiddenEffects($, statsTableCell.parent());
        }

        // Extract description
        statisticsHeading.nextUntil('h2, h3').each((i, elem) => {
            if (!$(elem).text().includes('Hidden Effect')) {
                const italic = $(elem).find('i, em').text().trim();
                if (italic && !italic.includes('Hidden Effect') && !italic.includes('Storage Slip')) {
                    description += italic + ' ';
                }
            }
        });

        return {
            url,
            tooltipLines,
            hiddenEffects,
            description: description.trim()
        };

    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('  ❌ Page not found (404)');
        } else {
            console.error('  ❌ Error fetching page:', error.message);
        }
        return null;
    }
}

// Apply formatting rules to transform wiki data into tooltip format
function applyFormattingRules(tooltipLines) {
    return tooltipLines.map(line => {
        let formatted = line;

        // Rule 1 & 2: Remove space after slot/weapon tag and before race
        // [Head] All Races → [Head]All Races
        // (Great Axe) All Races → (Great Axe)All Races
        formatted = formatted.replace(/\[([^\]]+)\]\s+/g, '[$1]');
        formatted = formatted.replace(/\(([^)]+)\)\s+/g, '($1)');

        // Rule 3: Remove spaces in stat increases
        // HP +50 → HP+50, DEX +15 → DEX+15
        formatted = formatted.replace(/([A-Z][A-Za-z\s]*?)\s+([+\-]\d+%?)/g, '$1$2');

        // Rule 4: Remove spaces after colons ONLY before numbers
        // DEF: 35 → DEF:35, DMG: 94 → DMG:94, Delay: 504 → Delay:504
        // But KEEP space for text: "Additional effect: Wind" stays "Additional effect: Wind"
        formatted = formatted.replace(/:\s+(?=\d)/g, ':');
        formatted = formatted.replace(/\.\s+(\d+)/g, '.$1');

        // Rule 6: Remove spaces around job slashes
        // WAR / MNK / BST → WAR/MNK/BST
        formatted = formatted.replace(/\s*\/\s*/g, '/');

        return formatted;
    });
}

// Insert wiki tooltip data into database
async function insertWikiTooltip(itemId, wikiData) {
    const formattedLines = applyFormattingRules(wikiData.tooltipLines);

    await pool.query(`
        INSERT INTO item_wiki_tooltips (item_id, tooltip_lines, hidden_effects, wiki_description, wiki_url)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (item_id)
        DO UPDATE SET
            tooltip_lines = $2,
            hidden_effects = $3,
            wiki_description = $4,
            wiki_url = $5,
            last_scraped = CURRENT_TIMESTAMP
    `, [
        itemId,
        JSON.stringify(formattedLines),
        JSON.stringify(wikiData.hiddenEffects),
        wikiData.description,
        wikiData.url
    ]);
}

// Main execution
(async () => {
    try {
        console.log('=== Wiki Tooltip Test Population ===');
        console.log('Populating 4 test items...\n');

        let successCount = 0;
        let failCount = 0;

        for (const item of TEST_ITEMS) {
            console.log(`[${TEST_ITEMS.indexOf(item) + 1}/${TEST_ITEMS.length}] ${item.db_name}`);

            // Get item ID from database
            const itemQuery = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [item.db_name]
            );

            if (itemQuery.rows.length === 0) {
                console.log(`  ❌ Item not found in database\n`);
                failCount++;
                continue;
            }

            const itemId = itemQuery.rows[0].itemid;
            console.log(`  ✓ Found item ID: ${itemId}`);

            // Scrape wiki page
            const wikiData = await scrapeWikiPage(item.wiki_name);

            if (wikiData) {
                console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines`);

                // Apply formatting rules
                const formattedLines = applyFormattingRules(wikiData.tooltipLines);
                console.log('  ✓ Applied formatting rules:');
                formattedLines.forEach((line, idx) => {
                    console.log(`     ${idx + 1}. ${line}`);
                });

                // Insert into database
                await insertWikiTooltip(itemId, wikiData);
                console.log('  ✅ Inserted into database\n');
                successCount++;
            } else {
                console.log('  ❌ Failed to scrape wiki page\n');
                failCount++;
            }

            // Rate limit: 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('=== SUMMARY ===');
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`Total: ${TEST_ITEMS.length}`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
