require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function recreateAndImport() {
    console.log('=== Step 1: Creating Tables ===\n');
    
    try {
        const createSQL = `
BEGIN;

DROP TABLE IF EXISTS item_equipment CASCADE;
DROP TABLE IF EXISTS item_weapon CASCADE;
DROP TABLE IF EXISTS item_basic CASCADE;
DROP TABLE IF EXISTS item_mods CASCADE;

CREATE TABLE item_basic (
    itemid INTEGER PRIMARY KEY,
    subid INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    sortname TEXT NOT NULL,
    "stackSize" SMALLINT NOT NULL DEFAULT 1,
    flags INTEGER NOT NULL DEFAULT 0,
    "aH" SMALLINT NOT NULL DEFAULT 99,
    "NoSale" SMALLINT NOT NULL DEFAULT 0,
    "BaseSell" BIGINT NOT NULL DEFAULT 0,
    is_rare BOOLEAN DEFAULT FALSE,
    is_ex BOOLEAN DEFAULT FALSE
);

CREATE TABLE item_equipment (
    "itemId" INTEGER PRIMARY KEY,
    name TEXT,
    level SMALLINT NOT NULL DEFAULT 0,
    ilevel SMALLINT NOT NULL DEFAULT 0,
    jobs BIGINT NOT NULL DEFAULT 0,
    "MId" INTEGER NOT NULL DEFAULT 0,
    "shieldSize" SMALLINT NOT NULL DEFAULT 0,
    "scriptType" INTEGER NOT NULL DEFAULT 0,
    slot INTEGER NOT NULL DEFAULT 0,
    rslot INTEGER NOT NULL DEFAULT 0,
    su_level SMALLINT NOT NULL DEFAULT 0,
    race SMALLINT NOT NULL DEFAULT 255
);

CREATE TABLE item_weapon (
    "itemId" INTEGER PRIMARY KEY,
    name TEXT,
    skill SMALLINT NOT NULL DEFAULT 0,
    subskill SMALLINT NOT NULL DEFAULT 0,
    ilvl_skill INTEGER NOT NULL DEFAULT 0,
    ilvl_parry INTEGER NOT NULL DEFAULT 0,
    ilvl_macc INTEGER NOT NULL DEFAULT 0,
    "dmgType" BIGINT NOT NULL DEFAULT 0,
    hit SMALLINT NOT NULL DEFAULT 1,
    delay INTEGER NOT NULL DEFAULT 0,
    dmg BIGINT NOT NULL DEFAULT 0,
    unlock_points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE item_mods (
    "itemId" INTEGER NOT NULL,
    "modId" SMALLINT NOT NULL,
    value SMALLINT NOT NULL,
    PRIMARY KEY ("itemId", "modId")
);

COMMIT;`;
        
        await pool.query(createSQL);
        console.log('✅ Tables created!\n');
        
        console.log('=== Step 2: Importing Data (this will take 2-3 minutes) ===\n');
        
        const files = [
            { file: '001_item_basic.sql', expected: 22072, table: 'item_basic' },
            { file: '002_item_equipment.sql', expected: 7378, table: 'item_equipment' },
            { file: '003_item_weapon.sql', expected: 4795, table: 'item_weapon' },
            { file: '005_item_mods.sql', expected: 23334, table: 'item_mods' }
        ];
        
        const CONVERTED_SQL_DIR = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';
        
        for (const { file, expected, table } of files) {
            console.log(`Importing ${file}...`);
            const startTime = Date.now();
            const filePath = path.join(CONVERTED_SQL_DIR, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
            let insertCount = 0;
            let batchStatements = [];
            
            for (const statement of statements) {
                if (statement.toUpperCase().includes('INSERT INTO')) {
                    batchStatements.push(statement);
                    insertCount++;
                    
                    if (batchStatements.length >= 1000) {
                        await pool.query(batchStatements.join(';'));
                        batchStatements = [];
                        process.stdout.write(`\r  Progress: ${insertCount} / ${expected} rows...`);
                    }
                }
            }
            
            if (batchStatements.length > 0) {
                await pool.query(batchStatements.join(';'));
            }
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\r  ✓ Imported ${insertCount} records in ${elapsed}s`);
        }
        
        console.log('\n✅ Import complete!');
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

recreateAndImport();
