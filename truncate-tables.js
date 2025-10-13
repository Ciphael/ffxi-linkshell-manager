const { Pool } = require('pg');
require('dotenv').config();

async function truncateTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    console.log('Truncating item tables...\n');

    try {
        // Truncate in order to avoid foreign key issues
        await pool.query('TRUNCATE TABLE item_mods CASCADE');
        console.log('✓ Truncated item_mods');

        await pool.query('TRUNCATE TABLE weapon_skills CASCADE');
        console.log('✓ Truncated weapon_skills');

        await pool.query('TRUNCATE TABLE item_weapon CASCADE');
        console.log('✓ Truncated item_weapon');

        await pool.query('TRUNCATE TABLE item_equipment CASCADE');
        console.log('✓ Truncated item_equipment');

        await pool.query('TRUNCATE TABLE item_basic CASCADE');
        console.log('✓ Truncated item_basic');

        console.log('\n✅ All tables truncated successfully');

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

truncateTables();
