const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Abjuration result items from wiki
const abjurationItems = [
    // Apogee set
    'apogee_crown', 'apogee_crown_+1', 'apogee_dalmatica', 'apogee_dalmatica_+1',
    'apogee_mitts', 'apogee_mitts_+1', 'apogee_slacks', 'apogee_slacks_+1',
    'apogee_pumps', 'apogee_pumps_+1',
    // Ryuo set
    'ryuo_somen', 'ryuo_somen_+1', 'ryuo_domaru', 'ryuo_domaru_+1',
    'ryuo_tekko', 'ryuo_tekko_+1', 'ryuo_hakama', 'ryuo_hakama_+1',
    'ryuo_sune-ate', 'ryuo_sune-ate_+1',
    // Sky items (from earlier scraping, these are abjuration results)
    'zenith_crown', 'zenith_crown_+1', 'zenith_mitts', 'zenith_mitts_+1',
    'koenig_cuirass', 'koenig_cuirass_+1', 'koenig_diechlings', 'koenig_diechlings_+1',
    'kaiser_schaller', 'kaiser_schaller_+1', 'kaiser_handschuhs', 'kaiser_handschuhs_+1',
    // Add more sets as needed
    'crimson_cuisses', 'crimson_cuisses_+1', 'crimson_finger_gauntlets', 'crimson_finger_gauntlets_+1',
    // Gems
    'gem_of_the_east', 'gem_of_the_south', 'gem_of_the_west', 'gem_of_the_north',
    // Scarecrow
    'scarecrow_scythe',
    // Libation/Oblation
    'libation_abjuration', 'oblation_abjuration'
];

// Get item IDs from database
(async () => {
    try {
        console.log('Finding abjuration-related items in database...\n');

        const result = await pool.query(`
            SELECT itemid, name
            FROM item_basic
            WHERE name = ANY($1::text[])
            ORDER BY name
        `, [abjurationItems]);

        console.log(`Found ${result.rows.length} items in database\n`);

        // Save to JSON for the scraper
        fs.writeFileSync(
            'abjuration_items_to_scrape.json',
            JSON.stringify(result.rows, null, 2)
        );

        console.log('Items to scrape:');
        result.rows.forEach(item => {
            console.log(`  ${item.itemid}: ${item.name}`);
        });

        console.log(`\nSaved to abjuration_items_to_scrape.json`);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
