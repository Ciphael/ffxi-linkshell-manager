const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// MOD_NAMES mapping from frontend (for comparison)
const MOD_NAMES = {
    1: 'DEF', 2: 'HP', 3: 'HPP', 5: 'MP', 6: 'MPP',
    8: 'STR', 9: 'DEX', 10: 'VIT', 11: 'AGI', 12: 'INT', 13: 'MND', 14: 'CHR',
    16: 'Ice Resistance', 17: 'Wind Resistance', 18: 'Earth Resistance',
    19: 'Lightning Resistance', 20: 'Water Resistance', 21: 'Light Resistance', 22: 'Dark Resistance',
    23: 'Attack', 24: 'Ranged Attack', 25: 'Accuracy', 26: 'Ranged Accuracy',
    27: 'Enmity', 29: 'Haste', 30: 'Evasion', 31: 'Magic Evasion',
    73: 'Store TP', 165: 'Critical Hit Rate', 169: 'Movement Speed',
    288: 'Double Attack', 302: 'Triple Attack', 384: 'Haste',
    1178: 'Dragon Affinity'
};

// Reverse mapping: name -> modId
const MOD_IDS = {};
for (const [modId, name] of Object.entries(MOD_NAMES)) {
    MOD_IDS[name.toLowerCase()] = parseInt(modId);
}

// Test set: Sky Gear (armor), weapons, accessories
// IMPORTANT: Wiki URLs use Title_Case for all words, including hyphenated compounds
// Examples: Sune-Ate (not Sune-ate), Tonbo-Giri (not Tonbo-giri)
const SKY_GEAR_TEST_SET = [
    // Armor (Rare/Ex)
    { db_name: 'byakkos_haidate', wiki_name: 'Byakko%27s_Haidate' },
    { db_name: 'genbus_kabuto', wiki_name: 'Genbu%27s_Kabuto' },
    { db_name: 'kirins_osode', wiki_name: 'Kirin%27s_Osode' },
    { db_name: 'seiryus_kote', wiki_name: 'Seiryu%27s_Kote' },
    { db_name: 'suzakus_sune-ate', wiki_name: 'Suzaku%27s_Sune-Ate' }, // Note: Capital A in "Ate"
    { db_name: 'crimson_greaves', wiki_name: 'Crimson_Greaves' },
    { db_name: 'blood_greaves', wiki_name: 'Blood_Greaves' },
    // Armor (non-Rare/Ex)
    { db_name: 'walkure_mask', wiki_name: 'Walkure_Mask' },
    // Weapons
    { db_name: 'tonbo-giri', wiki_name: 'Tonbo-Giri' },
    { db_name: 'scarecrow_scythe', wiki_name: 'Scarecrow_Scythe' },
    { db_name: 'byakkos_axe', wiki_name: 'Byakko%27s_Axe' }
];

// Parse wiki tooltip lines to extract stat names and values
function parseWikiStats(tooltipLines) {
    const stats = {};

    for (const line of tooltipLines) {
        // Match patterns: "STAT: value" or "STAT +value" or "STAT value"
        // Examples: "DEF: 42", "HP +15", "DEX +3", "DMG: 72"
        const patterns = [
            // Pattern 1: "STAT: value" (e.g., "DEF: 42", "DMG: 72")
            /([A-Z][A-Za-z\s]*?)\s*:\s*(\d+)/g,
            // Pattern 2: "STAT +value" or "STAT -value" (e.g., "HP +15", "DEX +3")
            /\b([A-Z][A-Z]+)\s*([+\-]\d+)/g,
            // Pattern 3: Multi-word stats (e.g., "Ranged Attack +10")
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*([+\-]\d+)/g
        ];

        for (const pattern of patterns) {
            const matches = [...line.matchAll(pattern)];
            for (const match of matches) {
                const statName = match[1].trim();
                const value = parseInt(match[2]);

                // Skip job abbreviations (WAR, MNK, etc.) but keep HP, MP, DEF, etc.
                if (statName.length === 3 && statName === statName.toUpperCase()) {
                    if (!['HP', 'MP', 'DEF', 'AGI', 'STR', 'DEX', 'VIT', 'INT', 'MND', 'CHR', 'DMG'].includes(statName)) {
                        continue;
                    }
                }

                // Skip "Lv" prefix
                if (statName.startsWith('Lv')) {
                    continue;
                }

                stats[statName] = value;
            }
        }

        // Check for special effects like "Double Attack", "Triple Attack"
        if (line.includes('"Double Attack"') || line.includes('Double Attack')) {
            const match = line.match(/Double Attack["\s]+([+\-]?\d+)/i);
            if (match) {
                stats['Double Attack'] = parseInt(match[1]);
            }
        }

        if (line.includes('"Triple Attack"') || line.includes('Triple Attack')) {
            const match = line.match(/Triple Attack["\s]+([+\-]?\d+)/i);
            if (match) {
                stats['Triple Attack'] = parseInt(match[1]);
            }
        }

        // Elemental resistances (e.g., "Ice +20", "Lightning +50")
        const elementMatches = line.matchAll(/(Fire|Ice|Wind|Earth|Lightning|Water|Light|Dark)\s+([+\-]\d+)/g);
        for (const match of elementMatches) {
            stats[`${match[1]} Resistance`] = parseInt(match[2]);
        }

        // Haste percentage (e.g., "Haste +5%")
        const hasteMatch = line.match(/Haste\s+([+\-]\d+)%/);
        if (hasteMatch) {
            stats['Haste'] = parseInt(hasteMatch[1]) * 100; // Database stores basis points
        }

        // Enmity (e.g., "Enmity +3")
        const enmityMatch = line.match(/Enmity\s+([+\-]\d+)/);
        if (enmityMatch) {
            stats['Enmity'] = parseInt(enmityMatch[1]);
        }
    }

    return stats;
}

// Fetch database stats for an item
async function fetchDatabaseStats(itemId) {
    const stats = {};

    // Get basic equipment stats (DEF, level, etc.)
    const equipQuery = await pool.query(
        'SELECT * FROM item_equipment WHERE "itemId" = $1',
        [itemId]
    );

    if (equipQuery.rows.length > 0) {
        const equip = equipQuery.rows[0];
        if (equip.def) stats['DEF'] = equip.def;
    }

    // Get weapon stats (DMG, Delay)
    const weaponQuery = await pool.query(
        'SELECT * FROM item_weapon WHERE "itemId" = $1',
        [itemId]
    );

    if (weaponQuery.rows.length > 0) {
        const weapon = weaponQuery.rows[0];
        if (weapon.dmg) stats['DMG'] = weapon.dmg;
        if (weapon.delay) stats['Delay'] = weapon.delay;
    }

    // Get item mods (HP, MP, STR, DEX, etc.)
    const modsQuery = await pool.query(
        'SELECT "modId", value FROM item_mods WHERE "itemId" = $1',
        [itemId]
    );

    for (const row of modsQuery.rows) {
        const modId = row.modId;
        const value = row.value;
        const modName = MOD_NAMES[modId];

        if (modName) {
            stats[modName] = value;
        } else {
            stats[`Mod${modId}`] = value;
        }
    }

    // Get latent effects
    const latentsQuery = await pool.query(
        'SELECT "modId", value, "latentId", "latentParam" FROM item_latents WHERE "itemId" = $1',
        [itemId]
    );

    const latents = latentsQuery.rows.map(row => ({
        modId: row.modId,
        value: row.value,
        latentId: row.latentId,
        latentParam: row.latentParam,
        modName: MOD_NAMES[row.modId] || `Mod${row.modId}`
    }));

    return { stats, latents };
}

// Compare wiki stats vs database stats
function compareStats(wikiStats, dbData, itemName) {
    console.log('\n🔍 COMPARISON ANALYSIS:');
    console.log('─'.repeat(50));

    const dbStats = dbData.stats;
    const allStatNames = new Set([...Object.keys(wikiStats), ...Object.keys(dbStats)]);

    const differences = [];
    const unknownMods = [];
    const matches = [];

    for (const statName of allStatNames) {
        const wikiValue = wikiStats[statName];
        const dbValue = dbStats[statName];

        if (wikiValue !== undefined && dbValue !== undefined) {
            // Use numeric comparison to avoid type coercion issues
            if (Number(wikiValue) === Number(dbValue)) {
                matches.push(`✓ ${statName}: ${wikiValue} (match)`);
            } else {
                differences.push(`⚠️  ${statName}: Wiki=${wikiValue}, DB=${dbValue} (MISMATCH)`);
            }
        } else if (wikiValue !== undefined && dbValue === undefined) {
            // Stat in wiki but not in database
            const modId = MOD_IDS[statName.toLowerCase()];
            if (modId) {
                differences.push(`➕ ${statName}: ${wikiValue} (in wiki, NOT in DB - modId ${modId})`);
            } else {
                unknownMods.push(`❓ ${statName}: ${wikiValue} (in wiki, UNKNOWN MOD - needs mapping)`);
            }
        } else if (wikiValue === undefined && dbValue !== undefined) {
            // Stat in database but not in wiki
            differences.push(`➖ ${statName}: ${dbValue} (in DB, NOT in wiki)`);
        }
    }

    // Report results
    if (matches.length > 0) {
        console.log('\n✅ Matching Stats:');
        matches.forEach(m => console.log(`   ${m}`));
    }

    if (differences.length > 0) {
        console.log('\n⚠️  Differences:');
        differences.forEach(d => console.log(`   ${d}`));
    }

    if (unknownMods.length > 0) {
        console.log('\n❗ UNKNOWN MODS (need to add to MOD_NAMES):');
        unknownMods.forEach(u => console.log(`   ${u}`));
    }

    // Report latent effects
    if (dbData.latents.length > 0) {
        console.log('\n🔒 Database Latent Effects:');
        dbData.latents.forEach(lat => {
            console.log(`   - ${lat.modName} ${lat.value > 0 ? '+' : ''}${lat.value} (latentId: ${lat.latentId}, param: ${lat.latentParam})`);
        });
    }

    return {
        matches: matches.length,
        differences: differences.length,
        unknownMods: unknownMods.length,
        unknownModDetails: unknownMods
    };
}

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
                    console.log('\n🔒 Wiki Hidden Effects:', wikiData.hiddenEffects.length);
                    wikiData.hiddenEffects.forEach(effect => console.log(`  - ${effect}`));
                }

                if (wikiData.description) {
                    console.log('\n📝 Description:', wikiData.description);
                }

                // Parse wiki stats
                const wikiStats = parseWikiStats(wikiData.tooltipLines);

                // Fetch database stats
                const dbData = await fetchDatabaseStats(itemId);

                // Compare and report
                const comparison = compareStats(wikiStats, dbData, item.db_name);

                console.log('\n📈 SUMMARY:');
                console.log(`   Matches: ${comparison.matches}`);
                console.log(`   Differences: ${comparison.differences}`);
                console.log(`   Unknown Mods: ${comparison.unknownMods}`);

                // Store in database (for now, just log - we'll implement storage later)
                console.log('\n✓ Successfully parsed and compared wiki data');
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
