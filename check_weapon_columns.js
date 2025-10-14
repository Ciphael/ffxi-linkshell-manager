const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_weapon'
            ORDER BY ordinal_position
        `);

        console.log('item_weapon columns:\n');
        result.rows.forEach(r => {
            console.log(`  ${r.column_name}: ${r.data_type}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
