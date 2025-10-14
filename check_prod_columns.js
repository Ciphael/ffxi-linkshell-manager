require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkColumns() {
    try {
        console.log('Checking item_equipment columns...');
        const equipResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_equipment'
            ORDER BY ordinal_position
        `);
        console.log('item_equipment columns:', equipResult.rows);

        console.log('\nChecking item_weapon columns...');
        const weaponResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_weapon'
            ORDER BY ordinal_position
        `);
        console.log('item_weapon columns:', weaponResult.rows);

        console.log('\nChecking item_basic columns...');
        const basicResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'item_basic'
            ORDER BY ordinal_position
        `);
        console.log('item_basic columns:', basicResult.rows);

        console.log('\nTesting actual query...');
        const testQuery = `
            SELECT md.itemId, ie."itemId" as eq_itemId, iw."itemId" as wp_itemId
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie."itemId"
            LEFT JOIN item_weapon iw ON md.itemId = iw."itemId"
            LIMIT 5
        `;
        const testResult = await pool.query(testQuery);
        console.log('Test query results:', testResult.rows);

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Detail:', error.detail);
        console.error('Hint:', error.hint);
        await pool.end();
        process.exit(1);
    }
}

checkColumns();
