const { Pool } = require('pg');
require('dotenv').config();

async function checkDroplist() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('Checking mob_droplist table...\n');

        const count = await pool.query(`SELECT COUNT(*) FROM mob_droplist;`);
        console.log(`Total rows in mob_droplist: ${count.rows[0].count}`);

        const sample = await pool.query(`
            SELECT * FROM mob_droplist LIMIT 5;
        `);
        console.log('\nSample rows:');
        console.log(JSON.stringify(sample.rows, null, 2));

        // Check for columns
        const columns = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'mob_droplist'
            ORDER BY ordinal_position;
        `);
        console.log('\nColumns in mob_droplist:');
        columns.rows.forEach(row => console.log(`  - ${row.column_name}`));

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkDroplist();
