const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const result = await pool.query(`
            SELECT
                ib.name,
                jsonb_array_length(iwt.tooltip_lines) as line_count,
                iwt.tooltip_lines,
                iwt.hidden_effects,
                iwt.image_url
            FROM item_wiki_tooltips iwt
            JOIN item_basic ib ON iwt.item_id = ib.itemid
            ORDER BY iwt.item_id
        `);

        console.log('=== Wiki Tooltips in Database ===\n');

        for (const row of result.rows) {
            console.log(`${row.name} (${row.line_count} lines):`);

            // Show image URL if available
            if (row.image_url) {
                // Extract filename from URL (e.g., "12818.png" from "/images/7/70/12818.png/revision/latest?cb=...")
                const urlParts = row.image_url.split('/');
                const pngIndex = urlParts.findIndex(part => part.endsWith('.png'));
                const filename = pngIndex >= 0 ? urlParts[pngIndex] : urlParts.pop().split('?')[0];
                console.log(`  Image: ${filename}`);
            }

            // tooltip_lines is already a JSONB object, no need to parse
            row.tooltip_lines.forEach((line, idx) => {
                console.log(`  ${idx + 1}. ${line}`);
            });

            if (row.hidden_effects && row.hidden_effects.length > 0) {
                console.log('  Hidden Effects:');
                row.hidden_effects.forEach(effect => {
                    console.log(`    - ${effect}`);
                });
            }
            console.log('');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
