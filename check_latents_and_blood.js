const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        // Check if latent type 59 exists at all
        console.log('=== CHECKING LATENT TYPE 59 (VS CREATURE) ===\n');
        const latentCount = await pool.query('SELECT COUNT(*) FROM item_latents WHERE "latentId" = 59');
        console.log(`Total latents with latentId 59: ${latentCount.rows[0].count}`);

        if (parseInt(latentCount.rows[0].count) > 0) {
            const samples = await pool.query(`
                SELECT ib.name, il."modId", il.value, il."latentParam"
                FROM item_latents il
                JOIN item_basic ib ON il."itemId" = ib.itemid
                WHERE il."latentId" = 59
                LIMIT 5
            `);
            console.log('\nSample items with latent type 59:');
            samples.rows.forEach(row => {
                console.log(`  ${row.name}: Mod ${row.modId} = ${row.value} (vs creature ${row.latentParam})`);
            });
        }

        // Check Blood Cuisses
        console.log('\n\n=== CHECKING BLOOD CUISSES ===\n');
        const bloodCuisses = await pool.query(`
            SELECT itemid, name FROM item_basic WHERE name ILIKE '%blood%cuisses%'
        `);
        console.log(`Found ${bloodCuisses.rows.length} items:`);
        bloodCuisses.rows.forEach(row => {
            console.log(`  ${row.itemid}: ${row.name}`);
        });

        // Check Crimson → Blood relationship
        console.log('\n\n=== CHECKING CRIMSON → BLOOD RELATIONSHIP ===\n');
        const crimsonQuery = await pool.query(`
            SELECT
                ib.itemid as crimson_id,
                ib.name as crimson_name,
                ic.enhanced_1_id,
                ib2.name as enhanced_name
            FROM item_basic ib
            LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
            LEFT JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
            WHERE ib.name ILIKE 'crimson%'
            AND ib.name NOT ILIKE '%+%'
        `);

        crimsonQuery.rows.forEach(row => {
            console.log(`${row.crimson_name} (${row.crimson_id})`);
            console.log(`  → Enhanced: ${row.enhanced_name || 'NONE'}\n`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
