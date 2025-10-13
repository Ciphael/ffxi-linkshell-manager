const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importTestData() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const TEST_SQL_DIR = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\test-sql';

    const files = [
        'test_001_item_basic.sql',
        'test_002_item_equipment.sql',
        'test_003_item_weapon.sql',
        'test_004_weapon_skills.sql',
        'test_005_item_mods.sql'
    ];

    console.log('=== Importing Test Data ===\n');

    try {
        for (const file of files) {
            console.log(`Importing ${file}...`);
            const filePath = path.join(TEST_SQL_DIR, file);

            if (!fs.existsSync(filePath)) {
                console.error(`  ❌ File not found: ${filePath}`);
                continue;
            }

            const sql = fs.readFileSync(filePath, 'utf8');

            // Split by semicolons to execute statement by statement
            // Filter out empty statements and comments
            const statements = sql.split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'));

            let insertCount = 0;
            for (const statement of statements) {
                // Only execute INSERT statements, skip all DDL
                if (statement.toUpperCase().includes('INSERT INTO')) {
                    await pool.query(statement);
                    insertCount++;
                }
                // Skip CREATE TABLE, DROP TABLE, etc. - already handled by migration
            }

            console.log(`  ✓ Imported ${insertCount} records from ${file}`);
        }

        // Verify counts
        console.log('\n=== Verification ===\n');

        const counts = [
            { table: 'item_basic', expected: 100 },
            { table: 'item_equipment', expected: 50 },
            { table: 'item_weapon', expected: 30 },
            { table: 'weapon_skills', expected: 209 },
            { table: 'item_mods', expected: 104 }
        ];

        for (const { table, expected } of counts) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const actual = parseInt(result.rows[0].count);
            const status = actual === expected ? '✓' : '⚠';
            console.log(`${status} ${table}: ${actual} rows (expected: ${expected})`);
        }

        console.log('\n✅ Test data import complete!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

importTestData();
