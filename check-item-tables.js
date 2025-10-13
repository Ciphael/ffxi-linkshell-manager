const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkItemTables() {
    try {
        // Check item_equipment structure
        console.log('\n=== ITEM_EQUIPMENT COLUMNS ===');
        const itemEquipmentColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'item_equipment'
            ORDER BY ordinal_position;
        `);

        if (itemEquipmentColumns.rows.length === 0) {
            console.log('Table does not exist');
        } else {
            itemEquipmentColumns.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        }

        // Check item_weapon structure
        console.log('\n=== ITEM_WEAPON COLUMNS ===');
        const itemWeaponColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'item_weapon'
            ORDER BY ordinal_position;
        `);

        if (itemWeaponColumns.rows.length === 0) {
            console.log('Table does not exist');
        } else {
            itemWeaponColumns.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        }

        // Check item_basic structure
        console.log('\n=== ITEM_BASIC COLUMNS ===');
        const itemBasicColumns = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'item_basic'
            ORDER BY ordinal_position;
        `);

        if (itemBasicColumns.rows.length === 0) {
            console.log('Table does not exist');
        } else {
            itemBasicColumns.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        }

        // Count items with high levels
        console.log('\n=== ITEM COUNTS ===');

        try {
            const equipCount = await pool.query(`SELECT COUNT(*) FROM item_equipment WHERE level >= 76`);
            console.log(`Items in item_equipment with level >= 76: ${equipCount.rows[0].count}`);
        } catch (e) {
            console.log(`Error counting item_equipment: ${e.message}`);
        }

        try {
            const weaponCount = await pool.query(`SELECT COUNT(*) FROM item_weapon WHERE level >= 76`);
            console.log(`Items in item_weapon with level >= 76: ${weaponCount.rows[0].count}`);
        } catch (e) {
            console.log(`Error counting item_weapon: ${e.message}`);
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkItemTables();
