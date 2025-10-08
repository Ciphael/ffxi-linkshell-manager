const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkSchema() {
    try {
        // List all tables
        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n=== EXISTING TABLES ===');
        tables.rows.forEach(row => console.log(`- ${row.table_name}`));

        // Check event_bosses structure
        console.log('\n=== EVENT_BOSSES COLUMNS ===');
        const eventBossesColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'event_bosses'
            ORDER BY ordinal_position;
        `);
        eventBossesColumns.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Check if item_classifications exists
        const classCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'item_classifications'
            );
        `);
        console.log('\n=== ITEM_CLASSIFICATIONS TABLE ===');
        console.log(classCheck.rows[0].exists ? 'EXISTS' : 'DOES NOT EXIST');

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkSchema();
