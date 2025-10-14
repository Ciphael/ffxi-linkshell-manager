const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test set: Sky Gear (armor), weapons, accessories
const SKY_GEAR_TEST_SET = [
    // Armor (Rare/Ex)
    { db_name: 'byakkos_haidate', wiki_name: 'Byakko%27s_Haidate' },
    { db_name: 'genbus_kabuto', wiki_name: 'Genbu%27s_Kabuto' },
    { db_name: 'kirins_osode', wiki_name: 'Kirin%27s_Osode' },
    { db_name: 'seiryus_kote', wiki_name: 'Seiryu%27s_Kote' },
    { db_name: 'suzakus_sune-ate', wiki_name: 'Suzaku%27s_Sune-ate' },
    { db_name: 'crimson_greaves', wiki_name: 'Crimson_Greaves' },
    { db_name: 'blood_greaves', wiki_name: 'Blood_Greaves' },
    // Armor (non-Rare/Ex)
    { db_name: 'walkure_mask', wiki_name: 'Walkure_Mask' },
    // Weapons
    { db_name: 'tonbo-giri', wiki_name: 'Tonbo-Giri' },
    { db_name: 'scarecrow_scythe', wiki_name: 'Scarecrow_Scythe' },
    { db_name: 'byakkos_axe', wiki_name: 'Byakko%27s_Axe' }
];

// Clean text content from a div (preserve structure, remove HTML)
function cleanDivText($, elem) {
    let text = '';

    // Process child nodes
    $(elem).contents().each((i, node) => {
        if (node.type === 'text') {
            // Direct text node
            const nodeText = $(node).text();
            text += nodeText;

            // Add space after elemental resistance values (pattern: +nn or -nn)
            if (nodeText.match(/^[+\-]\d+$/)) {
                text += ' ';
            }
        } else if (node.type === 'tag') {
            const tagName = node.name;

            if (tagName === 'br') {
                // Preserve line breaks as space
                text += ' ';
            } else if (tagName === 'img') {
                // For elemental resistance icons, use alt text
                const alt = $(node).attr('alt');
                if (alt && alt.startsWith('Resistance to')) {
                    // Extract element name (e.g., "Ice" from "Resistance to Ice")
                    const element = alt.replace('Resistance to ', '').trim();
                    text += element + ' ';
                }
            } else if (tagName === 'a') {
                // Extract link text (e.g., "HP" from link to /wiki/Hit_Points)
                // But also recursively process children in case there are images
                const linkText = $(node).text();
                if (linkText) {
                    text += linkText;
                } else {
                    // No text, might contain images - recurse
                    text += cleanDivText($, node);
                }
            } else if (tagName === 'b' || tagName === 'strong') {
                // Bold text - preserve content
                text += $(node).text();
            } else if (tagName === 'span') {
                // Skip spans that contain Rare/Ex images
                const hasRareEx = $(node).find('img[alt="Rare"], img[alt="Exclusive"]').length > 0;
                if (!hasRareEx) {
                    text += cleanDivText($, node);
                }
            } else {
                // Recursively process other tags
                text += cleanDivText($, node);
            }
        }
    });

    return text;
}

// Extract hidden effects from elements after the stats table
function extractHiddenEffects($, statsTable) {
    const hiddenEffects = [];

    // Look for content immediately after the stats table
    let nextElem = statsTable.next();
    let foundHidden = false;

    // Check up to 5 elements after the table
    for (let i = 0; i < 5 && nextElem.length > 0; i++) {
        const text = nextElem.text();

        // Stop if we hit another heading
        if (nextElem.is('h2, h3, h4')) {
            break;
        }

        // Check for "Hidden Effect" text
        if (text.includes('Hidden Effect')) {
            foundHidden = true;
        }

        // If we found hidden effects marker, extract list items
        if (foundHidden) {
            nextElem.find('li').each((j, li) => {
                const effectText = $(li).text().trim();
                if (effectText && !effectText.includes('Hidden Effect')) {
                    hiddenEffects.push(effectText);
                }
            });

            // Also check if this element itself is a list
            if (nextElem.is('ul, ol')) {
                nextElem.find('li').each((j, li) => {
                    const effectText = $(li).text().trim();
                    if (effectText && !effectText.includes('Hidden Effect')) {
                        hiddenEffects.push(effectText);
                    }
                });
            }

            // Stop after finding hidden effects section
            if (foundHidden && nextElem.next().is('h2, h3, h4')) {
                break;
            }
        }

        nextElem = nextElem.next();
    }

    return hiddenEffects;
}

// Scrape a single wiki page
async function scrapeWikiPage(wikiName) {
    const url = `https://ffxiclopedia.fandom.com/wiki/${wikiName}`;
    console.log(`\nFetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Find Statistics section by ID
        const statisticsHeading = $('#Statistics').parent();

        if (statisticsHeading.length === 0) {
            console.log('❌ No Statistics section found');
            return null;
        }

        console.log('✓ Found Statistics section');

        const tooltipLines = [];
        let hiddenEffects = [];
        let description = '';

        // Debug: log next few elements
        console.log('Debug: Looking for table-cell div...');
        let debugElem = statisticsHeading.next();
        for (let i = 0; i < 3 && debugElem.length > 0; i++) {
            const tagName = debugElem.prop('tagName');
            const style = debugElem.attr('style') || 'no-style';
            const hasChildDivs = debugElem.find('div').length;
            console.log(`  [${i}] <${tagName}> style="${style.substring(0, 50)}..." children: ${hasChildDivs} divs`);
            debugElem = debugElem.next();
        }

        // Find the display:table container first
        const tableContainer = statisticsHeading.nextAll('div').filter((i, elem) => {
            const style = $(elem).attr('style') || '';
            return style.includes('display:table');
        }).first();

        // Find ALL table-cell divs within it (there should be 2: icon + stats)
        const tableCells = tableContainer.find('div[style*="display:table-cell"]');
        console.log(`  Found ${tableCells.length} table-cell divs`);

        // The stats cell is usually the second one (first is icon)
        let statsTableCell = tableCells.length > 1 ? tableCells.eq(1) : tableCells.first();

        if (statsTableCell.length > 0) {
            console.log('✓ Found stats table-cell structure');

            // Debug: count children
            const childCount = statsTableCell.children('div').length;
            console.log(`  Found ${childCount} child divs`);

            // Debug: output raw HTML (first 500 chars)
            const rawHtml = statsTableCell.html();
            if (rawHtml) {
                console.log(`  Raw HTML (first 500 chars):\n${rawHtml.substring(0, 500).replace(/\n/g, ' ')}...`);
            }

            if (childCount === 1) {
                // The structure might be nested - check grandchildren
                const grandChildren = statsTableCell.find('div > div').length;
                console.log(`  Found ${grandChildren} grandchild divs - checking one level deeper`);

                // Try to extract from the nested structure
                const nestedContainer = statsTableCell.children('div').first();
                const nestedChildCount = nestedContainer.children('div').length;
                console.log(`  Nested container has ${nestedChildCount} direct children`);

                // If there are nested children, use them instead
                if (nestedChildCount > 1) {
                    console.log('  → Using nested children as tooltip lines');
                    statsTableCell = nestedContainer;
                }
            }

            // Extract each child div as a separate tooltip line
            statsTableCell.children('div').each((i, childDiv) => {
                const lineText = cleanDivText($, childDiv).trim();
                console.log(`  [${i}] Raw text (${lineText.length} chars): "${lineText.substring(0, 80)}..."`);

                // Skip empty lines and the first line (item name with Rare/Ex)
                if (lineText && i > 0) {
                    // Clean up excessive whitespace
                    const cleanedLine = lineText.replace(/\s+/g, ' ').trim();
                    if (cleanedLine) {
                        console.log(`    → Added: "${cleanedLine}"`);
                        tooltipLines.push(cleanedLine);
                    }
                }
            });

            // Look for hidden effects after the stats table
            hiddenEffects = extractHiddenEffects($, statsTableCell.parent());
        }

        // Extract description from italicized text (not in hidden effects section)
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
            console.log('❌ Page not found (404)');
        } else {
            console.error('❌ Error fetching page:', error.message);
        }
        return null;
    }
}

// Main execution
(async () => {
    try {
        console.log('=== FFXI Wiki Statistics Scraper ===');
        console.log('Testing with Sky Gear set...\n');

        for (const item of SKY_GEAR_TEST_SET) {
            console.log(`\n[${ SKY_GEAR_TEST_SET.indexOf(item) + 1 }/${SKY_GEAR_TEST_SET.length}] ${item.db_name}`);
            console.log('─'.repeat(50));

            // Get item ID from database
            const itemQuery = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [item.db_name]
            );

            if (itemQuery.rows.length === 0) {
                console.log(`❌ Item not found in database: ${item.db_name}`);
                continue;
            }

            const itemId = itemQuery.rows[0].itemid;
            console.log(`✓ Found item ID: ${itemId}`);

            // Scrape wiki page
            const wikiData = await scrapeWikiPage(item.wiki_name);

            if (wikiData) {
                console.log('\n📊 EXTRACTED DATA:');
                console.log('Tooltip Lines:', wikiData.tooltipLines.length);
                wikiData.tooltipLines.forEach(line => console.log(`  - ${line}`));

                if (wikiData.hiddenEffects.length > 0) {
                    console.log('\n🔒 Hidden Effects:', wikiData.hiddenEffects.length);
                    wikiData.hiddenEffects.forEach(effect => console.log(`  - ${effect}`));
                }

                if (wikiData.description) {
                    console.log('\n📝 Description:', wikiData.description);
                }

                // Store in database (for now, just log - we'll implement storage later)
                console.log('\n✓ Successfully parsed wiki data');
            }

            // Rate limit: wait 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n\n=== TEST COMPLETE ===');
        console.log(`Processed ${SKY_GEAR_TEST_SET.length} items from Sky Gear test set`);

        await pool.end();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
