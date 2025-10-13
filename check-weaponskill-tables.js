const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkWeaponskillTables() {
    try {
        // List all tables that might contain weapon skill data
        console.log('\n=== ALL TABLES ===');
        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%skill%'
            ORDER BY table_name;
        `);
        tables.rows.forEach(row => console.log(`- ${row.table_name}`));

        // Check for weapon_skills table
        console.log('\n=== WEAPON_SKILLS TABLE CHECK ===');
        const wsTableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'weapon_skills'
            );
        `);
        console.log(`weapon_skills table exists: ${wsTableExists.rows[0].exists}`);

        if (wsTableExists.rows[0].exists) {
            console.log('\n=== WEAPON_SKILLS COLUMNS ===');
            const wsColumns = await pool.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'weapon_skills'
                ORDER BY ordinal_position;
            `);
            wsColumns.rows.forEach(row => {
                console.log(`${row.column_name} (${row.data_type})`);
            });

            console.log('\n=== SAMPLE WEAPON_SKILLS DATA ===');
            const wsSample = await pool.query(`
                SELECT * FROM weapon_skills LIMIT 10;
            `);
            console.log(wsSample.rows);
        }

        // Check mods table for WEAPONSKILL entries
        console.log('\n=== WEAPONSKILL-RELATED MODS ===');
        const wsMods = await pool.query(`
            SELECT * FROM mods
            WHERE name LIKE '%WEAPONSKILL%'
            ORDER BY modid;
        `);
        wsMods.rows.forEach(row => {
            console.log(`modid: ${row.modid}, name: ${row.name}`);
        });

        // Check for an item with WEAPONSKILL mod
        console.log('\n=== SAMPLE ITEM WITH WEAPONSKILL MOD ===');
        const wsItems = await pool.query(`
            SELECT
                ie.itemid,
                ie.name as item_name,
                im.modid,
                m.name as mod_name,
                im.value
            FROM item_equipment ie
            JOIN item_mods im ON ie.itemid = im.itemid
            JOIN mods m ON im.modid = m.modid
            WHERE m.name LIKE '%WEAPONSKILL%'
            LIMIT 5;
        `);
        console.log(wsItems.rows);

        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkWeaponskillTables();
