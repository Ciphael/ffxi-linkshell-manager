const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Convert database name to wiki page name
function dbNameToWikiName(dbName) {
    // Special possessive cases for Sky gods
    let wikiName = dbName
        .replace(/^byakkos_/, 'byakko\'s_')
        .replace(/^genbus_/, 'genbu\'s_')
        .replace(/^kirins_/, 'kirin\'s_')
        .replace(/^seiryus_/, 'seiryu\'s_')
        .replace(/^suzakus_/, 'suzaku\'s_');

    // Capitalize each word
    wikiName = wikiName
        .split('_')
        .map(word => {
            // Keep roman numerals uppercase
            if (word.match(/^(i|ii|iii|iv|v|vi)$/)) {
                return word.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join('_');

    // Special case for abjurations: Add colon after "Abjuration"
    // earthen_abjuration_head → Earthen_Abjuration:_Head
    wikiName = wikiName.replace(/_Abjuration_/g, '_Abjuration:_');

    // URL encode apostrophes
    wikiName = wikiName.replace(/'/g, '%27');

    return wikiName;
}

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

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const statisticsHeading = $('#Statistics').parent();

        if (statisticsHeading.length === 0) {
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
            return null;
        }
        throw error;
    }
}

// Apply formatting rules to transform wiki data into tooltip format
function applyFormattingRules(tooltipLines) {
    return tooltipLines.map(line => {
        let formatted = line;

        // Rule 1 & 2: Remove space after slot/weapon tag and before race
        formatted = formatted.replace(/\[([^\]]+)\]\s+/g, '[$1]');
        formatted = formatted.replace(/\(([^)]+)\)\s+/g, '($1)');

        // Rule 3: Remove spaces in stat increases
        formatted = formatted.replace(/([A-Z][A-Za-z\s]*?)\s+([+\-]\d+%?)/g, '$1$2');

        // Rule 4: Remove spaces after colons ONLY before numbers
        formatted = formatted.replace(/:\s+(?=\d)/g, ':');
        formatted = formatted.replace(/\.\s+(\d+)/g, '.$1');

        // Rule 6: Remove spaces around job slashes
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
        console.log('=== Sky Items Wiki Tooltip Population ===\n');

        // Get all Sky items from database
        const itemsResult = await pool.query(`
            SELECT DISTINCT
                ib.itemid,
                ib.name as item_name,
                m.mob_name
            FROM item_basic ib
            JOIN mob_droplist md ON ib.itemid = md.itemid
            JOIN mobs m ON md.dropid = m.dropid
            WHERE m.mob_name IN ('Byakko', 'Genbu', 'Suzaku', 'Seiryu', 'Kirin')
            ORDER BY m.mob_name, ib.name
        `);

        console.log(`Found ${itemsResult.rows.length} Sky items to process\n`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < itemsResult.rows.length; i++) {
            const item = itemsResult.rows[i];
            const progress = `[${i + 1}/${itemsResult.rows.length}]`;

            console.log(`${progress} ${item.item_name} (${item.mob_name})`);

            const wikiName = dbNameToWikiName(item.item_name);
            console.log(`  Wiki: ${wikiName}`);

            // Scrape wiki page
            try {
                const wikiData = await scrapeWikiPage(wikiName);

                if (wikiData && wikiData.tooltipLines.length > 0) {
                    console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines`);

                    // Insert into database
                    await insertWikiTooltip(item.itemid, wikiData);
                    console.log('  ✅ Inserted into database\n');
                    successCount++;
                } else {
                    console.log('  ⚠️  No tooltip data found (may be currency/material)\n');
                    skippedCount++;
                }
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}\n`);
                failCount++;
            }

            // Rate limit: 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('=== SUMMARY ===');
        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️  Skipped: ${skippedCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`Total: ${itemsResult.rows.length}`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
