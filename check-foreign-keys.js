const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkForeignKeys() {
    try {
        console.log('=== TABLES THAT REFERENCE ITEM IDs ===\n');

        // Check all tables for item_id or itemid columns
        const tablesWithItemRefs = await pool.query(`
            SELECT
                table_name,
                column_name,
                data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND (column_name LIKE '%item%id%' OR column_name = 'itemid')
            AND table_name NOT IN ('item_equipment', 'item_weapon', 'item_basic', 'item_mods', 'item_puppet', 'item_usable', 'item_furnishing', 'item_latents')
            ORDER BY table_name, column_name
        `);

        console.log('Tables with item references:');
        tablesWithItemRefs.rows.forEach(row => {
            console.log(`  ${row.table_name}.${row.column_name} (${row.data_type})`);
        });

        // For each table, count how many item references exist
        console.log('\n=== ITEM REFERENCE COUNTS BY TABLE ===\n');

        const tablesToCheck = [
            { table: 'mob_droplist', column: 'itemId' },
            { table: 'item_classifications', column: 'item_id' },
            { table: 'planned_event_drops', column: 'item_id' },
            { table: 'event_drops', column: 'item_id' },
            { table: 'ls_bank_transactions', column: 'item_id' },
            { table: 'ls_shop_inventory', column: 'item_id' },
            { table: 'ls_shop_transactions', column: 'item_id' },
            { table: 'user_wishlist', column: 'item_id' }
        ];

        for (const { table, column } of tablesToCheck) {
            try {
                const count = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const distinctCount = await pool.query(`SELECT COUNT(DISTINCT ${column}) as count FROM ${table} WHERE ${column} IS NOT NULL`);
                console.log(`${table}:`);
                console.log(`  Total rows: ${count.rows[0].count}`);
                console.log(`  Unique item IDs: ${distinctCount.rows[0].count}`);
            } catch (err) {
                console.log(`${table}: Table doesn't exist or error - ${err.message}`);
            }
        }

        // Check if any items in these tables DON'T exist in current item tables
        console.log('\n=== ORPHANED ITEM REFERENCES (Critical to preserve) ===\n');

        const orphanCheck = await pool.query(`
            SELECT DISTINCT md.itemId, 'mob_droplist' as source
            FROM mob_droplist md
            WHERE md.itemId IS NOT NULL
            AND md.itemId NOT IN (
                SELECT itemid FROM item_equipment
                UNION
                SELECT itemid FROM item_weapon
                UNION
                SELECT itemid FROM item_basic
            )
            ORDER BY md.itemId
            LIMIT 20
        `);

        if (orphanCheck.rows.length > 0) {
            console.log('⚠️  Items referenced but not in item tables:');
            orphanCheck.rows.forEach(row => {
                console.log(`  Item ID ${row.itemid} referenced in ${row.source}`);
            });
        } else {
            console.log('✅ No orphaned item references found in mob_droplist');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkForeignKeys();
