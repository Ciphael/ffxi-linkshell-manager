const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Import functions from populate_sky_wiki_tooltips.js
function dbNameToWikiName(dbName) {
    // Special possessive cases for Sky gods
    let wikiName = dbName
        .replace(/^byakkos_/, 'byakko\'s_')
        .replace(/^genbus_/, 'genbu\'s_')
        .replace(/^kirins_/, 'kirin\'s_')
        .replace(/^seiryus_/, 'seiryu\'s_')
        .replace(/^suzakus_/, 'suzaku\'s_');

    // Special case: lock_of_sirens_hair → Siren's_Hair (not Sirens_Hair)
    if (dbName === 'lock_of_sirens_hair') {
        return 'Siren%27s_Hair';
    }

    // Capitalize words (sentence case: keep small words lowercase)
    const smallWords = ['of', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    wikiName = wikiName
        .split('_')
        .map((word, index) => {
            // Keep roman numerals uppercase
            if (word.match(/^(i|ii|iii|iv|v|vi)$/i)) {
                return word.toUpperCase();
            }
            // Always capitalize first word, otherwise check if it's a small word
            if (index === 0 || !smallWords.includes(word.toLowerCase())) {
                // Handle hyphenated words - capitalize each part
                if (word.includes('-')) {
                    return word.split('-').map(part =>
                        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                    ).join('-');
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
        })
        .join('_');

    // Special case for abjurations: Add colon after "Abjuration"
    // earthen_abjuration_head → Earthen_Abjuration:_Head
    wikiName = wikiName.replace(/_Abjuration_/g, '_Abjuration:_');

    // URL encode apostrophes
    wikiName = wikiName.replace(/'/g, '%27');

    return wikiName;
}

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

async function tryFetchWikiPage(wikiName) {
    const variations = [wikiName];

    // Add variations without common prefixes
    const prefixes = ['Piece_of_', 'Spool_of_', 'Vial_of_', 'Square_of_', 'Slice_of_', 'Lock_of_', 'Scroll_of_', 'Gem_of_'];
    for (const prefix of prefixes) {
        if (wikiName.startsWith(prefix)) {
            variations.push(wikiName.substring(prefix.length));

            // For "vial_of_black_beetle_blood" → try "Beetle_Blood" (skip color adjectives)
            const withoutPrefix = wikiName.substring(prefix.length);
            const colorAdjectives = ['Black_', 'White_', 'Red_', 'Blue_', 'Green_'];
            for (const color of colorAdjectives) {
                if (withoutPrefix.startsWith(color)) {
                    variations.push(withoutPrefix.substring(color.length));
                }
            }
        }
    }

    // Try each variation
    for (const variant of variations) {
        const url = `https://ffxiclopedia.fandom.com/wiki/${variant}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return { response, url };
        } catch (error) {
            if (error.response && error.response.status === 404) {
                continue; // Try next variation
            }
            throw error; // Other errors should be thrown
        }
    }

    return null; // All variations failed
}

async function scrapeWikiPage(wikiName) {
    try {
        const result = await tryFetchWikiPage(wikiName);
        if (!result) {
            return null; // 404 on all variations
        }

        const { response, url } = result;
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
                        // Only trim trailing spaces, preserve leading spaces for indentation
                        const partText = cleanDivText($, $part.get(0)).replace(/\s+$/g, '');
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
        // Non-404 errors should be logged
        console.error('Error scraping wiki page:', error.message);
        throw error;
    }
}

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
        console.log('=== ALL Items Wiki Tooltip Population ===\n');

        // Get all items that appear in converts_to or are missing tooltips
        const itemsResult = await pool.query(`
            SELECT DISTINCT
                ib.itemid,
                ib.name as item_name
            FROM item_basic ib
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE iwt.item_id IS NULL
            OR ib.name IN (
                SELECT DISTINCT UNNEST(string_to_array(converts_to, ','))
                FROM item_equipment
                WHERE converts_to IS NOT NULL AND converts_to != ''
            )
            ORDER BY ib.name
            LIMIT 100
        `);

        console.log(`Found ${itemsResult.rows.length} items to process\n`);

        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < itemsResult.rows.length; i++) {
            const item = itemsResult.rows[i];
            const progress = `[${i + 1}/${itemsResult.rows.length}]`;

            console.log(`${progress} ${item.item_name}`);

            const wikiName = dbNameToWikiName(item.item_name);
            console.log(`  Wiki: ${wikiName}`);

            // Scrape wiki page
            try {
                const wikiData = await scrapeWikiPage(wikiName);

                // Accept items with tooltip lines, descriptions, or hidden effects
                if (wikiData && (wikiData.tooltipLines.length > 0 || wikiData.description || wikiData.hiddenEffects.length > 0)) {
                    console.log(`  ✓ Scraped ${wikiData.tooltipLines.length} tooltip lines, description: ${wikiData.description ? 'Yes' : 'No'}`);

                    // Insert into database
                    await insertWikiTooltip(item.itemid, wikiData);
                    console.log('  ✅ Inserted into database\n');
                    successCount++;
                } else {
                    console.log('  ⚠️  No tooltip data or description found\n');
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
