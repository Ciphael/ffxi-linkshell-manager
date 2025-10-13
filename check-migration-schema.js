const { Pool } = require('pg');
require('dotenv').config();

async function checkMigrationSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('Checking migrations table schema...\n');

        const result = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'migrations'
            ORDER BY ordinal_position;
        `);

        console.log('Columns in migrations table:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Get recent migrations
        console.log('\nRecent migrations:');
        const migrations = await pool.query(`
            SELECT * FROM migrations ORDER BY id DESC LIMIT 5;
        `);

        console.log(JSON.stringify(migrations.rows, null, 2));

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkMigrationSchema();
