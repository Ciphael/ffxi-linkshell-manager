const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('=== Finding All Sky Items ===\n');

        // Query all items from Sky gods
        const result = await pool.query(`
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

        console.log(`Found ${result.rows.length} Sky items:\n`);

        const byBoss = {};
        result.rows.forEach(row => {
            if (!byBoss[row.mob_name]) {
                byBoss[row.mob_name] = [];
            }
            byBoss[row.mob_name].push(row);
        });

        for (const [boss, items] of Object.entries(byBoss)) {
            console.log(`\n${boss} (${items.length} items):`);
            items.forEach(item => {
                console.log(`  - ${item.item_name} (ID: ${item.itemid})`);
            });
        }

        console.log(`\n\nTotal: ${result.rows.length} items`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
