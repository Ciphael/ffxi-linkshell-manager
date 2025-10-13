const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importFullData() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const CONVERTED_SQL_DIR = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';

    const files = [
        { file: '001_item_basic.sql', expected: 22072, table: 'item_basic' },
        { file: '002_item_equipment.sql', expected: 7378, table: 'item_equipment' },
        { file: '003_item_weapon.sql', expected: 4795, table: 'item_weapon' },
        { file: '004_weapon_skills.sql', expected: 209, table: 'weapon_skills' },
        { file: '005_item_mods.sql', expected: 23334, table: 'item_mods' }
    ];

    console.log('=== Importing Full AirSkyBoat Data ===\n');
    console.log('This will take 3-5 minutes. Please wait...\n');

    try {
        for (const { file, expected, table } of files) {
            console.log(`Importing ${file}...`);
            const startTime = Date.now();
            const filePath = path.join(CONVERTED_SQL_DIR, file);

            if (!fs.existsSync(filePath)) {
                console.error(`  ❌ File not found: ${filePath}`);
                continue;
            }

            const sql = fs.readFileSync(filePath, 'utf8');

            // Split by semicolons to execute statement by statement
            const statements = sql.split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'));

            let insertCount = 0;
            let batchStatements = [];

            for (const statement of statements) {
                if (statement.toUpperCase().includes('INSERT INTO')) {
                    batchStatements.push(statement);
                    insertCount++;

                    // Execute in batches of 1000 for performance
                    if (batchStatements.length >= 1000) {
                        await pool.query(batchStatements.join(';'));
                        batchStatements = [];
                        process.stdout.write(`\r  Progress: ${insertCount} / ${expected} rows...`);
                    }
                } else if (statement.toUpperCase().includes('CREATE TABLE') ||
                           statement.toUpperCase().includes('DROP TABLE')) {
                    // Skip DDL - already handled by migration
                }
            }

            // Execute remaining statements
            if (batchStatements.length > 0) {
                await pool.query(batchStatements.join(';'));
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\r  ✓ Imported ${insertCount} records in ${elapsed}s`);

            // Verify count
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const actual = parseInt(countResult.rows[0].count);
            if (actual === expected) {
                console.log(`  ✓ Verified: ${actual} rows in ${table}`);
            } else {
                console.log(`  ⚠ Warning: Expected ${expected}, got ${actual} rows`);
            }
            console.log('');
        }

        console.log('✅ Full data import complete!\n');

        // Final verification
        console.log('=== Final Verification ===\n');
        for (const { table, expected } of files) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const actual = parseInt(result.rows[0].count);
            const status = actual === expected ? '✓' : '⚠';
            console.log(`${status} ${table}: ${actual.toLocaleString()} rows (expected: ${expected.toLocaleString()})`);
        }

        await pool.end();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

importFullData();
