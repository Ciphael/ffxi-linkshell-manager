const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check a few examples of convertible items
        const result = await pool.query(`
            SELECT ib.itemid, ib.name, ib.convertible,
                   converts.name as converts_to_item_name
            FROM item_basic ib
            LEFT JOIN item_basic converts ON ib.convertible = converts.itemid
            WHERE ib.convertible IS NOT NULL
            LIMIT 20
        `);

        console.log('=== Convertible Items Examples ===\n');
        result.rows.forEach(row => {
            console.log(`${row.name} -> ${row.converts_to_item_name || '(unknown item)'}`);
            console.log(`  Item ID: ${row.itemid}, Converts to ID: ${row.convertible}`);
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
