const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// CORRECT mappings from wiki
const CORRECT_MAPPINGS = {
    // Aquarian -> Zenith (NOT Homam!)
    aquarian: {
        aquarian_abjuration_head: 'zenith_crown',
        aquarian_abjuration_body: 'dalmatica', // Zenith body piece
        aquarian_abjuration_hands: 'zenith_mitts',
        aquarian_abjuration_legs: 'zenith_slacks',
        aquarian_abjuration_feet: 'zenith_pumps'
    },
    // Dryadic -> Shura (already correct)
    dryadic: {
        dryadic_abjuration_head: 'shura_zunari_kabuto',
        dryadic_abjuration_body: 'shura_togi',
        dryadic_abjuration_hands: 'shura_kote',
        dryadic_abjuration_legs: 'shura_haidate',
        dryadic_abjuration_feet: 'shura_sune-ate'
    },
    // Earthen -> Adaman (NOT Nashira!)
    earthen: {
        earthen_abjuration_head: 'adaman_barbuta',
        earthen_abjuration_body: 'adaman_hauberk',
        earthen_abjuration_hands: 'adaman_mufflers',
        earthen_abjuration_legs: 'adaman_breeches',
        earthen_abjuration_feet: 'adaman_sollerets'
    },
    // Martial -> Koenig (NOT Shura!)
    martial: {
        martial_abjuration_head: 'koenig_schaller',
        martial_abjuration_body: 'koenig_cuirass',
        martial_abjuration_hands: 'koenig_handschuhs',
        martial_abjuration_legs: 'koenig_diechlings',
        martial_abjuration_feet: 'koenig_schuhs'
    },
    // Neptunal -> Hecatomb (already correct)
    neptunal: {
        neptunal_abjuration_head: 'hecatomb_cap',
        neptunal_abjuration_body: 'hecatomb_harness',
        neptunal_abjuration_hands: 'hecatomb_mittens',
        neptunal_abjuration_legs: 'hecatomb_subligar',
        neptunal_abjuration_feet: 'hecatomb_leggings'
    },
    // Wyrmal -> Crimson (already correct)
    wyrmal: {
        wyrmal_abjuration_head: 'crimson_mask',
        wyrmal_abjuration_body: 'crimson_scale_mail',
        wyrmal_abjuration_hands: 'crimson_finger_gauntlets',
        wyrmal_abjuration_legs: 'crimson_cuisses',
        wyrmal_abjuration_feet: 'crimson_greaves'
    }
};

(async () => {
    try {
        console.log('Fixing ALL abjuration conversions with correct data from wiki...\n');

        // Clear all previous wrong conversions first
        await pool.query('UPDATE item_classifications SET converts_to_item_id = NULL WHERE converts_to_item_id IS NOT NULL');
        console.log('✓ Cleared all previous conversions\n');

        // Process all abjuration types
        for (const [abjType, mappings] of Object.entries(CORRECT_MAPPINGS)) {
            console.log(`=== ${abjType.toUpperCase()} ===`);

            for (const [abjName, gearName] of Object.entries(mappings)) {
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

                    console.log(`✓ ${abjName} → ${gearName}`);
                } else {
                    console.log(`✗ MISSING: ${abjName} or ${gearName}`);
                }
            }
            console.log('');
        }

        console.log('✓ All abjuration conversions fixed!');

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
