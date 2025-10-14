const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Adding IGNORE columns...\n');

        // Add columns
        await pool.query(`ALTER TABLE item_basic ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE item_equipment ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE item_weapon ADD COLUMN IF NOT EXISTS ignore BOOLEAN DEFAULT FALSE`);

        console.log('✓ Added IGNORE columns\n');

        console.log('Marking level 76+ items as IGNORE...\n');

        // Mark level 76+ equipment items
        const eq = await pool.query(`UPDATE item_equipment SET ignore = TRUE WHERE level > 75`);
        console.log(`✓ Marked ${eq.rowCount} equipment items`);

        // For weapons, we need to join with item_equipment to get the level
        const wp = await pool.query(`
            UPDATE item_weapon iw
            SET ignore = TRUE
            FROM item_equipment ie
            WHERE iw."itemId" = ie."itemId" AND ie.level > 75
        `);
        console.log(`✓ Marked ${wp.rowCount} weapon items`);

        // Update item_basic
        const basic = await pool.query(`
            UPDATE item_basic
            SET ignore = TRUE
            WHERE itemid IN (
                SELECT "itemId" FROM item_equipment WHERE level > 75
            )
        `);
        console.log(`✓ Updated ${basic.rowCount} entries in item_basic\n`);

        // Create indexes
        console.log('Creating indexes...\n');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_basic_ignore ON item_basic(ignore)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_equipment_ignore ON item_equipment(ignore)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_item_weapon_ignore ON item_weapon(ignore)`);

        console.log('✓ Migration completed successfully!');

        // Check results
        const result = await pool.query(`
            SELECT COUNT(*) as ignored_count
            FROM item_basic
            WHERE ignore = TRUE
        `);

        console.log(`\n📊 Total items marked as IGNORE: ${result.rows[0].ignored_count}`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
