require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function testQuery() {
    try {
        const query = `
            SELECT DISTINCT ON (md.itemId, m.mob_name)
                md.itemId as item_id,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                ic.classification,
                ic.points_required,
                ic.market_rate,
                ic.estimated_value,
                ic.convertible,
                ic.converts_to_item_name,
                COALESCE(m.mob_name, 'Unknown Boss') as mob_name,
                ib.is_rare,
                ib.is_ex
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie.itemId
            LEFT JOIN item_weapon iw ON md.itemId = iw.itemId
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            LEFT JOIN mobs m ON md.dropId = m.dropid
            WHERE md.dropType IN (0, 1, 4) AND m.mob_name IS NOT NULL
            ORDER BY m.mob_name, md.itemId, COALESCE(ie.name, iw.name, ib.name)
        `;

        console.log('Testing market-rates query...');
        const result = await pool.query(query);
        console.log(`✓ Query succeeded! Got ${result.rows.length} rows`);
        if (result.rows.length > 0) {
            console.log('Sample row:', {
                item_id: result.rows[0].item_id,
                item_name: result.rows[0].item_name,
                is_rare: result.rows[0].is_rare,
                is_ex: result.rows[0].is_ex,
                mob_name: result.rows[0].mob_name
            });
        }
        await pool.end();
    } catch (error) {
        console.error('❌ Query failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

testQuery();
