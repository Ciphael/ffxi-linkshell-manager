const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runSingleMigration() {
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.error('Usage: node run-single-migration.js <migration-file>');
        process.exit(1);
    }

    const filePath = path.join(__dirname, 'migrations', migrationFile);

    if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`);
        process.exit(1);
    }

    try {
        console.log(`🚀 Running migration: ${migrationFile}\n`);

        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);

        console.log(`✅ Success: ${migrationFile}\n`);

        await pool.end();
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

runSingleMigration();
