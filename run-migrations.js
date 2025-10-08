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

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    try {
        console.log('🚀 Starting database migrations...\n');

        // Get all SQL files in order
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('⚠️  No migration files found');
            return;
        }

        console.log(`Found ${files.length} migration file(s):\n`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`📄 Running: ${file}`);

            try {
                await pool.query(sql);
                console.log(`✅ Success: ${file}\n`);
            } catch (error) {
                console.error(`❌ Error in ${file}:`);
                console.error(error.message);
                console.error(`\nStopping migrations. Fix the error and try again.\n`);
                process.exit(1);
            }
        }

        console.log('🎉 All migrations completed successfully!\n');

        // Verify what was created
        console.log('📊 Verifying database schema...\n');

        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('item_classifications', 'ls_funds', 'ls_fund_transactions', 'planned_event_drops')
            ORDER BY table_name;
        `);

        console.log('New tables created:');
        tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

        // Check event_bosses columns
        const columns = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'event_bosses'
            AND column_name IN ('quantity', 'boss_order', 'completed_at');
        `);

        console.log('\nEvent_bosses enhancements:');
        columns.rows.forEach(row => console.log(`  ✓ ${row.column_name} column added`));

        await pool.end();
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

runMigrations();
