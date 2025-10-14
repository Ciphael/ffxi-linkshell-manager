const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        console.log('Checking Scarecrow Scythe data:\n');

        const query = `
            SELECT
                ib.itemid,
                ib.name,
                it.description,
                (
                    SELECT json_agg(json_build_object('modId', "modId", 'value', value))
                    FROM item_mods im
                    WHERE im."itemId" = ib.itemid
                ) as mods,
                (
                    SELECT json_agg(json_build_object('modId', "modId", 'value', value, 'latentId', "latentId", 'latentParam', "latentParam"))
                    FROM item_latents il
                    WHERE il."itemId" = ib.itemid
                ) as latents
            FROM item_basic ib
            LEFT JOIN item_text it ON ib.itemid = it.itemid
            WHERE ib.name = 'scarecrow_scythe'
        `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('Scarecrow Scythe not found!');
        } else {
            const item = result.rows[0];
            console.log(`Item ID: ${item.itemid}`);
            console.log(`Name: ${item.name}`);
            console.log(`Description: ${item.description || 'MISSING'}`);
            console.log(`Additional Effect: ${item.additional_effect || 'NONE'}`);
            console.log(`\nMods:`, JSON.stringify(item.mods, null, 2));
            console.log(`\nLatents:`, JSON.stringify(item.latents, null, 2));
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
