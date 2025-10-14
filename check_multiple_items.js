const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const ITEMS_TO_CHECK = [
    'tonbo-giri',
    'seal_of_byakko',
    'spool_of_malboro_fiber',
    'piece_of_oxblood',
    'crimson_cuisses',
    'aquarian_abjuration_head',
    'wyrmal_abjuration_body'
];

(async () => {
    try {
        for (const itemName of ITEMS_TO_CHECK) {
            console.log(`\n========== ${itemName.toUpperCase()} ==========`);

            const query = `
                SELECT
                    ib.itemid,
                    ib.name,
                    it.description,
                    it.log_name,
                    ic.enhanced_1_id,
                    ib1.name as enhanced_1_name,
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
                LEFT JOIN item_classifications ic ON ib.itemid = ic.item_id
                LEFT JOIN item_basic ib1 ON ic.enhanced_1_id = ib1.itemid
                WHERE ib.name = $1
            `;

            const result = await pool.query(query, [itemName]);

            if (result.rows.length === 0) {
                console.log(`NOT FOUND IN DATABASE!`);
            } else {
                const item = result.rows[0];
                console.log(`Item ID: ${item.itemid}`);
                console.log(`Display Name: ${item.log_name || 'MISSING'}`);
                console.log(`Description: ${item.description || 'MISSING'}`);
                console.log(`Enhanced +1: ${item.enhanced_1_name || 'NONE'}`);
                console.log(`Mods: ${item.mods ? item.mods.length : 0} total`);
                if (item.mods && item.mods.length > 0) {
                    item.mods.forEach(m => {
                        console.log(`  - Mod ${m.modId}: ${m.value}`);
                    });
                }
                console.log(`Latents: ${item.latents ? item.latents.length : 0} total`);
                if (item.latents && item.latents.length > 0) {
                    item.latents.forEach(l => {
                        console.log(`  - Mod ${l.modId} (latent ${l.latentId}, param ${l.latentParam}): ${l.value}`);
                    });
                }
            }
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
