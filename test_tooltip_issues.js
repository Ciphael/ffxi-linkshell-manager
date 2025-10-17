const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('=== ISSUE INVESTIGATION ===\n');

        // Issue 1: Check gem items
        console.log('1. GEM ITEMS:');
        const gemsResult = await pool.query(`
            SELECT ib.name, iwt.wiki_description, iwt.tooltip_lines
            FROM item_basic ib
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE ib.name LIKE '%gem_of%'
            LIMIT 5
        `);
        gemsResult.rows.forEach(row => {
            console.log(`  ${row.name}: description = ${row.wiki_description || 'NULL'}`);
        });

        // Issue 1b: Check libation/oblation
        console.log('\n1b. LIBATION/OBLATION:');
        const libResult = await pool.query(`
            SELECT ib.name, iwt.wiki_description
            FROM item_basic ib
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE ib.name LIKE '%libation%' OR ib.name LIKE '%oblation%'
            LIMIT 5
        `);
        libResult.rows.forEach(row => {
            console.log(`  ${row.name}: description = ${row.wiki_description || 'NULL'}`);
        });

        // Issue 3: Check zenith crown
        console.log('\n3. ZENITH CROWN:');
        const zenithResult = await pool.query(`
            SELECT tooltip_lines FROM item_wiki_tooltips
            WHERE item_id IN (SELECT itemid FROM item_basic WHERE name = 'zenith_crown')
        `);
        if (zenithResult.rows.length > 0) {
            const lines = JSON.parse(zenithResult.rows[0].tooltip_lines);
            lines.forEach((line, i) => console.log(`  Line ${i + 1}: ${line}`));
        }

        // Issue 4: Check scarecrow scythe
        console.log('\n4. SCARECROW SCYTHE:');
        const scytheResult = await pool.query(`
            SELECT tooltip_lines FROM item_wiki_tooltips
            WHERE item_id IN (SELECT itemid FROM item_basic WHERE name = 'scarecrow_scythe')
        `);
        if (scytheResult.rows.length > 0) {
            const lines = JSON.parse(scytheResult.rows[0].tooltip_lines);
            console.log(`  Total lines: ${lines.length}`);
            lines.forEach((line, i) => console.log(`  Line ${i + 1}: ${line}`));
        } else {
            console.log('  NOT FOUND IN DATABASE');
        }

        // Issue 5: Check koenig/kaiser handschuhs
        console.log('\n5. KOENIG/KAISER HANDSCHUHS:');
        const handschuhsResult = await pool.query(`
            SELECT ib.name, iwt.tooltip_lines
            FROM item_basic ib
            LEFT JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE ib.name LIKE '%handschuhs%'
        `);
        handschuhsResult.rows.forEach(row => {
            console.log(`  ${row.name}:`);
            if (row.tooltip_lines) {
                const lines = JSON.parse(row.tooltip_lines);
                lines.forEach((line, i) => console.log(`    Line ${i + 1}: ${line}`));
            } else {
                console.log('    NO TOOLTIP DATA');
            }
        });

        // Issue 8: Check abjuration indentation
        console.log('\n8. ABJURATION INDENTATION:');
        const abjResult = await pool.query(`
            SELECT ib.name, iwt.tooltip_lines
            FROM item_basic ib
            JOIN item_wiki_tooltips iwt ON ib.itemid = iwt.item_id
            WHERE ib.name LIKE '%abjuration%'
            LIMIT 3
        `);
        abjResult.rows.forEach(row => {
            console.log(`  ${row.name}:`);
            const lines = JSON.parse(row.tooltip_lines);
            lines.forEach((line, i) => {
                const leadingSpaces = line.match(/^ +/);
                console.log(`    Line ${i + 1}: ${leadingSpaces ? `[${leadingSpaces[0].length} spaces]` : '[no indent]'} "${line}"`);
            });
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
