const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check Sky abjurations (the ones we populated)
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
            WHERE ib.name LIKE 'dryadic%'
               OR ib.name LIKE 'wyrmal%'
               OR ib.name LIKE 'martial%'
               OR ib.name LIKE 'neptunal%'
            ORDER BY ib.name
        `);

        console.log('Sky Abjurations (Dryadic, Wyrmal, Martial, Neptunal):');
        console.log(`Total found: ${result.rows.length}\n`);

        const withBoss = result.rows.filter(r => r.mob_name);
        const withoutBoss = result.rows.filter(r => !r.mob_name);
        const withConversion = result.rows.filter(r => r.converts_to_item_id);

        console.log(`With boss name: ${withBoss.length}`);
        console.log(`Without boss name: ${withoutBoss.length}`);
        console.log(`With conversion mapping: ${withConversion.length}\n`);

        if (withBoss.length > 0) {
            console.log('Abjurations WITH boss names:');
            withBoss.slice(0, 5).forEach(r => {
                console.log(`  ${r.item_name} (Boss: ${r.mob_name}) -> ${r.converts_to_name || 'NO MAPPING'}`);
            });
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
