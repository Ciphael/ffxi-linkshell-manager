const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check if any abjurations are in mob_droplist
        const result = await pool.query(`
            SELECT
                md.itemId,
                ib.name as item_name,
                m.mob_name,
                ic.converts_to_item_id,
                ib2.name as converts_to_name
            FROM mob_droplist md
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN mobs m ON md.dropId = m.dropid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            LEFT JOIN item_basic ib2 ON ic.converts_to_item_id = ib2.itemid
            WHERE ib.name LIKE '%abjuration%'
            ORDER BY ib.name
            LIMIT 10
        `);

        if (result.rows.length === 0) {
            console.log('❌ NO ABJURATIONS FOUND IN MOB_DROPLIST');
            console.log('Abjurations are not boss drops, so they will not appear in Item Configuration modal!');
            console.log('\nThe Item Configuration modal only shows items that bosses drop.');
            console.log('Abjurations need their own separate configuration page.');
        } else {
            console.log('Abjurations found in mob_droplist:\n');
            result.rows.forEach(r => {
                console.log(`  ${r.item_name} (Boss: ${r.mob_name}) -> ${r.converts_to_name || 'NOT MAPPED'}`);
            });
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
