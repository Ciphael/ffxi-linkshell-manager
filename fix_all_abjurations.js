require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Complete abjuration mapping based on wiki verification
const abjurationMappings = {
    // Earthen: Adaman → Armada
    'earthen_abjuration_head': { base: 'adaman_celata', enhanced: 'armada_celata' },
    'earthen_abjuration_body': { base: 'adaman_hauberk', enhanced: 'armada_hauberk' },
    'earthen_abjuration_hands': { base: 'adaman_mufflers', enhanced: 'armada_mufflers' },
    'earthen_abjuration_legs': { base: 'adaman_breeches', enhanced: 'armada_breeches' },
    'earthen_abjuration_feet': { base: 'adaman_sollerets', enhanced: 'armada_sollerets' },

    // Dryadic: Shura → Shura +1
    'dryadic_abjuration_head': { base: 'shura_zunari_kabuto', enhanced: 'shura_zunari_kabuto_+1' },
    'dryadic_abjuration_body': { base: 'shura_togi', enhanced: 'shura_togi_+1' },
    'dryadic_abjuration_hands': { base: 'shura_kote', enhanced: 'shura_kote_+1' },
    'dryadic_abjuration_legs': { base: 'shura_haidate', enhanced: 'shura_haidate_+1' },
    'dryadic_abjuration_feet': { base: 'shura_sune-ate', enhanced: 'shura_sune-ate_+1' },

    // Aquarian: Zenith/Dalmatica → +1
    'aquarian_abjuration_head': { base: 'zenith_crown', enhanced: 'zenith_crown_+1' },
    'aquarian_abjuration_body': { base: 'dalmatica', enhanced: 'dalmatica_+1' },
    'aquarian_abjuration_hands': { base: 'zenith_mitts', enhanced: 'zenith_mitts_+1' },
    'aquarian_abjuration_legs': { base: 'zenith_slacks', enhanced: 'zenith_slacks_+1' },
    'aquarian_abjuration_feet': { base: 'zenith_pumps', enhanced: 'zenith_pumps_+1' },

    // Martial: Koenig → Kaiser
    'martial_abjuration_head': { base: 'koenig_schaller', enhanced: 'kaiser_schaller' },
    'martial_abjuration_body': { base: 'koenig_cuirass', enhanced: 'kaiser_cuirass' },
    'martial_abjuration_hands': { base: 'koenig_handschuhs', enhanced: 'kaiser_handschuhs' },
    'martial_abjuration_legs': { base: 'koenig_diechlings', enhanced: 'kaiser_diechlings' },
    'martial_abjuration_feet': { base: 'koenig_schuhs', enhanced: 'kaiser_schuhs' },

    // Wyrmal: Crimson → Blood
    'wyrmal_abjuration_head': { base: 'crimson_mask', enhanced: 'blood_mask' },
    'wyrmal_abjuration_body': { base: 'crimson_scale_mail', enhanced: 'blood_scale_mail' },
    'wyrmal_abjuration_hands': { base: 'crimson_finger_gauntlets', enhanced: 'blood_finger_gauntlets' },
    'wyrmal_abjuration_legs': { base: 'crimson_cuisses', enhanced: 'blood_cuisses' },
    'wyrmal_abjuration_feet': { base: 'crimson_greaves', enhanced: 'blood_greaves' },

    // Neptunal: Hecatomb → Hecatomb +1
    'neptunal_abjuration_head': { base: 'hecatomb_cap', enhanced: 'hecatomb_cap_+1' },
    'neptunal_abjuration_body': { base: 'hecatomb_harness', enhanced: 'hecatomb_harness_+1' },
    'neptunal_abjuration_hands': { base: 'hecatomb_mittens', enhanced: 'hecatomb_mittens_+1' },
    'neptunal_abjuration_legs': { base: 'hecatomb_subligar', enhanced: 'hecatomb_subligar_+1' },
    'neptunal_abjuration_feet': { base: 'hecatomb_leggings', enhanced: 'hecatomb_leggings_+1' }
};

(async () => {
    try {
        console.log('=== FIXING ALL ABJURATION MAPPINGS ===\n');
        console.log('Source: https://ffxiclopedia.fandom.com/wiki/Category:Abjuration\n');

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const [abjName, mapping] of Object.entries(abjurationMappings)) {
            console.log(`\n[${abjName}]`);

            // Get item IDs for base and enhanced items
            const baseResult = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [mapping.base]
            );

            const enhancedResult = await pool.query(
                'SELECT itemid FROM item_basic WHERE name = $1',
                [mapping.enhanced]
            );

            if (baseResult.rows.length === 0) {
                console.log(`  ❌ Base item not found: ${mapping.base}`);
                errors++;
                continue;
            }

            if (enhancedResult.rows.length === 0) {
                console.log(`  ❌ Enhanced item not found: ${mapping.enhanced}`);
                errors++;
                continue;
            }

            const baseId = baseResult.rows[0].itemid;
            const enhancedId = enhancedResult.rows[0].itemid;

            // Check current mapping
            const currentResult = await pool.query(`
                SELECT converts_to_item_id, enhanced_1_id
                FROM item_classifications
                WHERE item_name = $1
            `, [abjName]);

            if (currentResult.rows.length === 0) {
                console.log(`  ⚠️  Abjuration not found in database`);
                skipped++;
                continue;
            }

            const current = currentResult.rows[0];

            // Check if update needed
            if (current.converts_to_item_id === baseId && current.enhanced_1_id === enhancedId) {
                console.log(`  ✓ Already correct`);
                console.log(`    Base: ${mapping.base} (${baseId})`);
                console.log(`    Enhanced: ${mapping.enhanced} (${enhancedId})`);
                skipped++;
                continue;
            }

            // Update the mapping
            await pool.query(`
                UPDATE item_classifications
                SET converts_to_item_id = $1,
                    enhanced_1_id = $2
                WHERE item_name = $3
            `, [baseId, enhancedId, abjName]);

            console.log(`  ✅ FIXED`);
            console.log(`    Old base: ${current.converts_to_item_id || 'NULL'}`);
            console.log(`    New base: ${mapping.base} (${baseId})`);
            console.log(`    Old enhanced: ${current.enhanced_1_id || 'NULL'}`);
            console.log(`    New enhanced: ${mapping.enhanced} (${enhancedId})`);
            fixed++;
        }

        console.log('\n========================================');
        console.log('SUMMARY');
        console.log('========================================');
        console.log(`Total abjurations: ${Object.keys(abjurationMappings).length}`);
        console.log(`✅ Fixed: ${fixed}`);
        console.log(`✓ Already correct: ${skipped}`);
        console.log(`❌ Errors: ${errors}`);

        // Verify all abjurations now
        console.log('\n========================================');
        console.log('VERIFICATION');
        console.log('========================================\n');

        const verifyResult = await pool.query(`
            SELECT
                ic.item_name,
                ic.converts_to_item_id,
                ib1.name as converts_to_name,
                ic.enhanced_1_id,
                ib2.name as enhanced_1_name
            FROM item_classifications ic
            LEFT JOIN item_basic ib1 ON ic.converts_to_item_id = ib1.itemid
            LEFT JOIN item_basic ib2 ON ic.enhanced_1_id = ib2.itemid
            WHERE ic.item_name LIKE '%abjuration%'
            AND ic.item_name NOT LIKE '%oblation%'
            AND ic.item_name NOT LIKE '%libation%'
            ORDER BY ic.item_name
        `);

        let allGood = true;
        verifyResult.rows.forEach(row => {
            const hasEnhanced = row.enhanced_1_id !== null;
            const icon = hasEnhanced ? '✅' : '❌';

            if (!hasEnhanced) allGood = false;

            console.log(`${icon} ${row.item_name}:`);
            console.log(`   Base: ${row.converts_to_name || 'NULL'}`);
            console.log(`   Enhanced: ${row.enhanced_1_name || 'NULL'}\n`);
        });

        if (allGood) {
            console.log('✅ ALL ABJURATIONS HAVE ENHANCED MAPPINGS!');
        } else {
            console.log('⚠️  Some abjurations still missing enhanced mappings');
        }

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
