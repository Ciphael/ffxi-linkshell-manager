const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = 'C:\\users\\roger\\desktop\\ffxi-linkshell-manager\\converted-sql';

function fixCreateTable(filePath) {
    console.log(`Fixing ${path.basename(filePath)}...`);

    let content = fs.readFileSync(filePath, 'utf8');

    // Fix data types
    content = content.replace(/smallint\(\d+\)\s+unsigned/gi, 'INTEGER');
    content = content.replace(/tinyint\(\d+\)\s+unsigned/gi, 'SMALLINT');
    content = content.replace(/int\(\d+\)\s+unsigned/gi, 'BIGINT');
    content = content.replace(/tinytext/gi, 'TEXT');
    content = content.replace(/binary\(\d+\)/gi, 'BYTEA');

    // Fix DEFAULT in CREATE TABLE
    content = content.replace(/NOT NULL DEFAULT (\d+)/gi, 'NOT NULL DEFAULT $1');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed`);
}

// Fix all converted files
const files = [
    '001_item_basic.sql',
    '002_item_equipment.sql',
    '003_item_weapon.sql',
    '004_weapon_skills.sql'
];

console.log('=== Fixing CREATE TABLE Statements ===\n');

files.forEach(file => {
    const filePath = path.join(OUTPUT_PATH, file);
    if (fs.existsSync(filePath)) {
        fixCreateTable(filePath);
    }
});

// Now add is_rare and is_ex columns to item_basic CREATE TABLE
console.log('\nAdding is_rare and is_ex columns to item_basic...');
const itemBasicPath = path.join(OUTPUT_PATH, '001_item_basic.sql');
let content = fs.readFileSync(itemBasicPath, 'utf8');

// Find the CREATE TABLE and add columns before PRIMARY KEY
content = content.replace(
    /PRIMARY KEY \("itemid"\)/,
    'is_rare BOOLEAN DEFAULT FALSE,\nis_ex BOOLEAN DEFAULT FALSE,\nPRIMARY KEY ("itemid")'
);

fs.writeFileSync(itemBasicPath, content, 'utf8');
console.log('  ✓ Added is_rare and is_ex columns');

console.log('\n✅ All CREATE TABLE statements fixed!');
