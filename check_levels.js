const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check level distribution
        const result = await pool.query(`
            SELECT
                CASE
                    WHEN level IS NULL THEN 'NULL'
                    WHEN level <= 75 THEN '≤75'
                    WHEN level > 75 THEN '>75'
                END as level_category,
                COUNT(*) as count
            FROM item_equipment
            GROUP BY level_category
            ORDER BY level_category
        `);

        console.log('Equipment Level Distribution:\n');
        result.rows.forEach(r => {
            console.log(`  ${r.level_category}: ${r.count} items`);
        });

        // Show some examples of high-level items
        const highLevel = await pool.query(`
            SELECT "itemId", name, level
            FROM item_equipment
            WHERE level > 75
            ORDER BY level DESC
            LIMIT 10
        `);

        if (highLevel.rows.length > 0) {
            console.log('\nExample items over level 75:');
            highLevel.rows.forEach(r => {
                console.log(`  ${r.name} (level ${r.level})`);
            });
        } else {
            console.log('\n✓ No items over level 75 found! (This is a level 75 cap server)');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
