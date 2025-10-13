const { Pool } = require('pg');
require('dotenv').config();

async function checkMigrationStatus() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('Checking migration history...\n');

        const result = await pool.query(`
            SELECT id, version, name, executed_at
            FROM migrations
            ORDER BY executed_at DESC
            LIMIT 10;
        `);

        console.log('Recent migrations:');
        result.rows.forEach(row => {
            console.log(`  ${row.version}: ${row.name} (executed: ${row.executed_at})`);
        });

        // Check if 020 was recorded
        const migration020 = await pool.query(`
            SELECT * FROM migrations WHERE version = '020';
        `);

        if (migration020.rows.length > 0) {
            console.log('\n⚠️  Migration 020 was already recorded as complete!');
            console.log('This explains why the tables are in a partial state.');
        } else {
            console.log('\n✓ Migration 020 has not been recorded yet.');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkMigrationStatus();
