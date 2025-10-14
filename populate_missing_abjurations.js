const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Mapping of abjurations to their gear
const MAPPINGS = {
    // Aquarian (Limbus) -> Homam
    aquarian: {
        aquarian_abjuration_head: 'homam_zucchetto',
        aquarian_abjuration_body: 'homam_corazza',
        aquarian_abjuration_hands: 'homam_manopolas',
        aquarian_abjuration_legs: 'homam_cosciales',
        aquarian_abjuration_feet: 'homam_gambieras'
    },
    // Earthen (Limbus) -> Nashira
    earthen: {
        earthen_abjuration_head: 'nashira_turban',
        earthen_abjuration_body: 'nashira_manteel',
        earthen_abjuration_hands: 'nashira_gages',
        earthen_abjuration_legs: 'nashira_seraweels',
        earthen_abjuration_feet: 'nashira_crackows'
    },
    // Crimson -> Blood (enhanced)
    crimson: {
        crimson_mask: 'blood_mask',
        crimson_scale_mail: 'blood_scale_mail',
        crimson_finger_gauntlets: 'blood_finger_gauntlets',
        crimson_cuisses: 'blood_cuisses',
        crimson_greaves: 'blood_greaves'
    }
};

(async () => {
    try {
        console.log('Populating missing abjuration conversions...\n');

        // Process Aquarian abjurations
        console.log('=== Aquarian -> Homam ===');
        for (const [abjName, gearName] of Object.entries(MAPPINGS.aquarian)) {
            const abjResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [abjName]);
            const gearResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [gearName]);

            if (abjResult.rows.length > 0 && gearResult.rows.length > 0) {
                const abjId = abjResult.rows[0].itemid;
                const gearId = gearResult.rows[0].itemid;

                await pool.query(`
                    INSERT INTO item_classifications (item_id, classification, converts_to_item_id)
                    VALUES ($1, 'Vendor Trash', $2)
                    ON CONFLICT (item_id)
                    DO UPDATE SET converts_to_item_id = $2
                `, [abjId, gearId]);

                console.log(`✓ ${abjName} (${abjId}) -> ${gearName} (${gearId})`);
            } else {
                console.log(`✗ MISSING: ${abjName} or ${gearName}`);
            }
        }

        // Process Earthen abjurations
        console.log('\n=== Earthen -> Nashira ===');
        for (const [abjName, gearName] of Object.entries(MAPPINGS.earthen)) {
            const abjResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [abjName]);
            const gearResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [gearName]);

            if (abjResult.rows.length > 0 && gearResult.rows.length > 0) {
                const abjId = abjResult.rows[0].itemid;
                const gearId = gearResult.rows[0].itemid;

                await pool.query(`
                    INSERT INTO item_classifications (item_id, classification, converts_to_item_id)
                    VALUES ($1, 'Vendor Trash', $2)
                    ON CONFLICT (item_id)
                    DO UPDATE SET converts_to_item_id = $2
                `, [abjId, gearId]);

                console.log(`✓ ${abjName} (${abjId}) -> ${gearName} (${gearId})`);
            } else {
                console.log(`✗ MISSING: ${abjName} or ${gearName}`);
            }
        }

        // Process Crimson -> Blood (enhanced)
        console.log('\n=== Crimson -> Blood (enhanced +1) ===');
        for (const [crimsonName, bloodName] of Object.entries(MAPPINGS.crimson)) {
            const crimsonResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [crimsonName]);
            const bloodResult = await pool.query('SELECT itemid FROM item_basic WHERE name = $1', [bloodName]);

            if (crimsonResult.rows.length > 0 && bloodResult.rows.length > 0) {
                const crimsonId = crimsonResult.rows[0].itemid;
                const bloodId = bloodResult.rows[0].itemid;

                await pool.query(`
                    INSERT INTO item_classifications (item_id, classification, enhanced_1_id)
                    VALUES ($1, 'Vendor Trash', $2)
                    ON CONFLICT (item_id)
                    DO UPDATE SET enhanced_1_id = $2
                `, [crimsonId, bloodId]);

                console.log(`✓ ${crimsonName} (${crimsonId}) -> ${bloodName} +1 (${bloodId})`);
            } else {
                console.log(`✗ MISSING: ${crimsonName} or ${bloodName}`);
            }
        }

        console.log('\n✓ All abjuration conversions populated successfully!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
