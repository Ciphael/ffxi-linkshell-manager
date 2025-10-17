require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    const result = await pool.query(`
        SELECT ib.name, iwt.tooltip_lines
        FROM item_wiki_tooltips iwt
        JOIN item_basic ib ON ib.itemid = iwt.item_id
        WHERE ib.name IN ('koenig_handschuhs', 'kaiser_handschuhs', 'blood_finger_gauntlets', 'crimson_finger_gauntlets')
        ORDER BY ib.name
    `);

    result.rows.forEach(r => {
        const lines = JSON.parse(r.tooltip_lines);
        console.log(`\n=== ${r.name} ===`);
        lines.forEach((line, idx) => console.log(`  ${idx}: ${line}`));
    });

    await pool.end();
})();
