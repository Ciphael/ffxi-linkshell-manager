const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('=== Sky Items Tooltip Verification ===\n');

        const result = await pool.query(`
            SELECT
                ib.name as item_name,
                iwt.tooltip_lines,
                iwt.wiki_url,
                m.mob_name
            FROM item_wiki_tooltips iwt
            JOIN item_basic ib ON iwt.item_id = ib.itemid
            JOIN mob_droplist md ON ib.itemid = md.itemid
            JOIN mobs m ON md.dropid = m.dropid
            WHERE m.mob_name IN ('Byakko', 'Genbu', 'Suzaku', 'Seiryu', 'Kirin')
            ORDER BY m.mob_name, ib.name
        `);

        console.log(`Found ${result.rows.length} items with wiki tooltips\n`);

        const byBoss = {};
        result.rows.forEach(row => {
            if (!byBoss[row.mob_name]) {
                byBoss[row.mob_name] = [];
            }
            // tooltip_lines is already parsed by JSONB type
            const lines = row.tooltip_lines;
            byBoss[row.mob_name].push({
                name: row.item_name,
                lineCount: lines.length,
                lines: lines
            });
        });

        for (const [boss, items] of Object.entries(byBoss)) {
            console.log(`\n=== ${boss} (${items.length} items) ===`);
            items.forEach(item => {
                console.log(`\n${item.name} (${item.lineCount} lines):`);
                item.lines.forEach((line, idx) => {
                    console.log(`  ${idx + 1}. ${line}`);
                });
            });
        }

        console.log(`\n\n=== SUMMARY ===`);
        console.log(`Total items with tooltips: ${result.rows.length}`);
        for (const [boss, items] of Object.entries(byBoss)) {
            console.log(`  ${boss}: ${items.length} items`);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
