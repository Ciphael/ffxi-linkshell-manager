const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Run the EXACT query from /api/market-rates
        const dropQuery = `
            SELECT DISTINCT ON (md.itemId, m.mob_name)
                md.itemId as item_id,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                ic.converts_to_item_id,
                COALESCE(m.mob_name, 'Unknown Boss') as mob_name
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie."itemId"
            LEFT JOIN item_weapon iw ON md.itemId = iw."itemId"
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            LEFT JOIN mobs m ON md.dropId = m.dropid
            WHERE md.dropType IN (0, 1, 4) AND m.mob_name IS NOT NULL
              AND ib.name LIKE '%abjuration%'
            ORDER BY m.mob_name, md.itemId
        `;

        const result = await pool.query(dropQuery);

        console.log(`Total abjurations returned by API query: ${result.rows.length}\n`);

        const withConversion = result.rows.filter(r => r.converts_to_item_id);
        console.log(`With converts_to_item_id: ${withConversion.length}\n`);

        if (withConversion.length > 0) {
            console.log('Sample abjurations WITH conversions in API results:');
            withConversion.slice(0, 10).forEach(r => {
                console.log(`  ${r.item_name} (${r.mob_name}) - converts_to_item_id: ${r.converts_to_item_id}`);
            });
        } else {
            console.log('❌ NO ABJURATIONS WITH CONVERSIONS IN API RESULTS!');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
