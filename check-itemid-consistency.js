const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkItemIdConsistency() {
    try {
        // Check some known items in our current database
        console.log('=== CHECKING CURRENT DATABASE ITEM IDs ===\n');

        // Sample equipment items
        const equipmentCheck = await pool.query(`
            SELECT itemid, name
            FROM item_equipment
            WHERE name IN ('spharai', 'mandau', 'homam_zucchetto', 'crimson_cuisses')
            ORDER BY itemid
        `);
        console.log('Equipment items:');
        equipmentCheck.rows.forEach(row => {
            console.log(`  ${row.itemid}: ${row.name}`);
        });

        // Sample weapon items
        const weaponCheck = await pool.query(`
            SELECT itemid, name
            FROM item_weapon
            WHERE name IN ('kraken_club', 'relic_knuckles')
            ORDER BY itemid
        `);
        console.log('\nWeapon items:');
        weaponCheck.rows.forEach(row => {
            console.log(`  ${row.itemid}: ${row.name}`);
        });

        // Check what's in mob_droplist
        console.log('\n=== ITEMS IN MOB_DROPLIST ===');
        const droplistItems = await pool.query(`
            SELECT DISTINCT md.itemid, COALESCE(ie.name, iw.name, ib.name) as item_name
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemid = ie.itemid
            LEFT JOIN item_weapon iw ON md.itemid = iw.itemid
            LEFT JOIN item_basic ib ON md.itemid = ib.itemid
            WHERE md.itemid IS NOT NULL
            ORDER BY md.itemid
            LIMIT 20
        `);
        console.log('Sample items from mob_droplist:');
        droplistItems.rows.forEach(row => {
            console.log(`  ${row.itemid}: ${row.item_name || 'UNKNOWN'}`);
        });

        // Check item_classifications
        console.log('\n=== ITEMS IN ITEM_CLASSIFICATIONS ===');
        const classifiedItems = await pool.query(`
            SELECT item_id, item_name, classification
            FROM item_classifications
            ORDER BY item_id
            LIMIT 20
        `);
        console.log('Sample classified items:');
        classifiedItems.rows.forEach(row => {
            console.log(`  ${row.item_id}: ${row.item_name} (${row.classification})`);
        });

        // Check ls_shop_inventory
        console.log('\n=== ITEMS IN LS_SHOP_INVENTORY ===');
        const shopItems = await pool.query(`
            SELECT item_id, item_name
            FROM ls_shop_inventory
            ORDER BY item_id
            LIMIT 10
        `);
        if (shopItems.rows.length > 0) {
            console.log('Sample shop items:');
            shopItems.rows.forEach(row => {
                console.log(`  ${row.item_id}: ${row.item_name}`);
            });
        } else {
            console.log('No items in shop inventory yet');
        }

        // Count references
        console.log('\n=== ITEM REFERENCE COUNTS ===');

        const droplistCount = await pool.query('SELECT COUNT(DISTINCT itemid) as count FROM mob_droplist WHERE itemid IS NOT NULL');
        console.log(`Unique items in mob_droplist: ${droplistCount.rows[0].count}`);

        const classCount = await pool.query('SELECT COUNT(*) as count FROM item_classifications');
        console.log(`Items in item_classifications: ${classCount.rows[0].count}`);

        const plannedCount = await pool.query('SELECT COUNT(DISTINCT item_id) as count FROM planned_event_drops WHERE item_id IS NOT NULL');
        console.log(`Unique items in planned_event_drops: ${plannedCount.rows[0].count}`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkItemIdConsistency();
