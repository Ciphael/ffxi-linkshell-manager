const { Pool } = require('pg');
require('dotenv').config();

async function checkTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('Checking current database tables...\n');

        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'item_basic',
                'item_equipment',
                'item_weapon',
                'item_mods',
                'weapon_skills',
                'item_basic_backup',
                'item_equipment_backup',
                'item_weapon_backup',
                'item_mods_backup'
            )
            ORDER BY table_name;
        `);

        console.log('Existing tables:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        if (result.rows.length === 0) {
            console.log('  (none of the expected tables found)');
        }

        // Check row counts for existing tables
        console.log('\nTable row counts:');
        for (const row of result.rows) {
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
            console.log(`  ${row.table_name}: ${countResult.rows[0].count} rows`);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
