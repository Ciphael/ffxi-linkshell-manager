const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const sql = fs.readFileSync('./migrations/029_add_ignore_column.sql', 'utf8');

        console.log('Running migration: 029_add_ignore_column.sql\n');

        await pool.query(sql);

        console.log('✓ Migration completed successfully!');

        // Check results
        const result = await pool.query(`
            SELECT COUNT(*) as ignored_count
            FROM item_basic
            WHERE ignore = TRUE
        `);

        console.log(`\nMarked ${result.rows[0].ignored_count} items as IGNORE (level 76+)`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
