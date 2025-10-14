const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const equipResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_equipment'
            ORDER BY ordinal_position
            LIMIT 5
        `);

        console.log('=== item_equipment columns ===\n');
        equipResult.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });

        const weaponResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_weapon'
            ORDER BY ordinal_position
            LIMIT 5
        `);

        console.log('\n=== item_weapon columns ===\n');
        weaponResult.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
