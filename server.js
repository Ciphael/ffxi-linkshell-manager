const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*', // Allow all origins for now, restrict later
    credentials: true
}));
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database!');
        release();
    }
});

// ============ API ROUTES ============

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'FFXI Linkshell API', 
        endpoints: {
            test: '/api/test',
            items: '/api/items',
            item_details: '/api/items/:id',
            mods: '/api/mods',
            weapons: '/api/weapons'
        }
    });
});

// Test route
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            message: 'API is working!',
            database: 'Connected',
            time: result.rows[0].now 
        });
    } catch (error) {
        res.json({ 
            message: 'API is working but database connection failed',
            error: error.message 
        });
    }
});

// Get all items with stats
app.get('/api/items', async (req, res) => {
    try {
        const { search, slot, minLevel, maxLevel, limit = 100 } = req.query;
        
        let query = `
            SELECT 
                ie.itemid,
                ie.name,
                ie.level,
                ie.slot,
                ie.jobs,
                STRING_AGG(
                    COALESCE(m.name, 'Mod' || im.modid) || ': ' || 
                    CASE 
                        WHEN im.value > 0 AND COALESCE(m.name, '') NOT IN ('DEF', 'DMG', 'DELAY') 
                        THEN '+' 
                        ELSE '' 
                    END || im.value,
                    ', ' ORDER BY im.modid
                ) AS stats
            FROM item_equipment ie
            LEFT JOIN item_mods im ON ie.itemid = im.itemid
            LEFT JOIN mods m ON im.modid = m.modid
            WHERE 1=1
        `;
        
        const params = [];
        
        if (search) {
            params.push(`%${search}%`);
            query += ` AND ie.name ILIKE $${params.length}`;
        }
        
        if (slot) {
            params.push(slot);
            query += ` AND ie.slot = $${params.length}`;
        }
        
        if (minLevel) {
            params.push(minLevel);
            query += ` AND ie.level >= $${params.length}`;
        }
        
        if (maxLevel) {
            params.push(maxLevel);
            query += ` AND ie.level <= $${params.length}`;
        }
        
        query += ` GROUP BY ie.itemid, ie.name, ie.level, ie.slot, ie.jobs
                   ORDER BY ie.level DESC, ie.name`;
        
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        
        const result = await pool.query(query, params);
        res.json({
            count: result.rows.length,
            items: result.rows
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items', details: error.message });
    }
});

// Get single item details
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get item base info
        const itemQuery = `
            SELECT * FROM item_equipment 
            WHERE itemid = $1
        `;
        const itemResult = await pool.query(itemQuery, [id]);
        
        if (itemResult.rows.length === 0) {
            // Try item_weapon table
            const weaponQuery = `SELECT * FROM item_weapon WHERE itemid = $1`;
            const weaponResult = await pool.query(weaponQuery, [id]);
            
            if (weaponResult.rows.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }
            
            // It's a weapon
            const statsQuery = `
                SELECT 
                    COALESCE(m.name, 'Mod' || im.modid) as stat_name,
                    im.modid,
                    im.value,
                    CASE 
                        WHEN COALESCE(m.name, '') IN ('DEF', 'DMG', 'DELAY') THEN im.value::text
                        WHEN im.value > 0 THEN '+' || im.value
                        ELSE im.value::text
                    END as formatted_value
                FROM item_mods im
                LEFT JOIN mods m ON im.modid = m.modid
                WHERE im.itemid = $1
                ORDER BY im.modid
            `;
            const statsResult = await pool.query(statsQuery, [id]);
            
            return res.json({
                type: 'weapon',
                item: weaponResult.rows[0],
                stats: statsResult.rows
            });
        }
        
        // Get item stats
        const statsQuery = `
            SELECT 
                COALESCE(m.name, 'Mod' || im.modid) as stat_name,
                im.modid,
                im.value,
                CASE 
                    WHEN COALESCE(m.name, '') IN ('DEF', 'DMG', 'DELAY') THEN im.value::text
                    WHEN im.value > 0 THEN '+' || im.value
                    ELSE im.value::text
                END as formatted_value
            FROM item_mods im
            LEFT JOIN mods m ON im.modid = m.modid
            WHERE im.itemid = $1
            ORDER BY im.modid
        `;
        const statsResult = await pool.query(statsQuery, [id]);
        
        res.json({
            type: 'equipment',
            item: itemResult.rows[0],
            stats: statsResult.rows
        });
    } catch (error) {
        console.error('Error fetching item details:', error);
        res.status(500).json({ error: 'Failed to fetch item details', details: error.message });
    }
});

// Search items by mod/stat
app.get('/api/items/by-mod/:modName', async (req, res) => {
    try {
        const { modName } = req.params;
        const { minValue = 0 } = req.query;
        
        const query = `
            SELECT 
                ie.itemid,
                ie.name,
                ie.level,
                ie.slot,
                im.value as mod_value
            FROM item_equipment ie
            JOIN item_mods im ON ie.itemid = im.itemid
            JOIN mods m ON im.modid = m.modid
            WHERE UPPER(m.name) = UPPER($1)
            AND im.value >= $2
            ORDER BY im.value DESC
            LIMIT 50
        `;
        
        const result = await pool.query(query, [modName, minValue]);
        res.json({
            mod: modName,
            minValue: minValue,
            count: result.rows.length,
            items: result.rows
        });
    } catch (error) {
        console.error('Error searching by mod:', error);
        res.status(500).json({ error: 'Failed to search by mod', details: error.message });
    }
});

// Get all available mods
app.get('/api/mods', async (req, res) => {
    try {
        const query = 'SELECT * FROM mods ORDER BY name';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching mods:', error);
        res.status(500).json({ error: 'Failed to fetch mods', details: error.message });
    }
});

// Get weapons with stats
app.get('/api/weapons', async (req, res) => {
    try {
        const { search, skill, limit = 100 } = req.query;
        
        let query = `
            SELECT 
                iw.itemid,
                iw.name,
                iw.skill,
                iw.dmg,
                iw.delay,
                ROUND((iw.dmg::numeric / NULLIF(iw.delay, 0) * 60), 2) AS dps,
                STRING_AGG(
                    COALESCE(m.name, 'Mod' || im.modid) || ': ' || 
                    CASE 
                        WHEN im.value > 0 AND COALESCE(m.name, '') NOT IN ('DMG', 'DELAY') 
                        THEN '+' 
                        ELSE '' 
                    END || im.value,
                    ', ' ORDER BY im.modid
                ) AS additional_stats
            FROM item_weapon iw
            LEFT JOIN item_mods im ON iw.itemid = im.itemid
            LEFT JOIN mods m ON im.modid = m.modid
            WHERE 1=1
        `;
        
        const params = [];
        
        if (search) {
            params.push(`%${search}%`);
            query += ` AND iw.name ILIKE $${params.length}`;
        }
        
        if (skill) {
            params.push(skill);
            query += ` AND iw.skill = $${params.length}`;
        }
        
        query += ` GROUP BY iw.itemid, iw.name, iw.skill, iw.dmg, iw.delay
                   ORDER BY iw.dmg DESC`;
        
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        
        const result = await pool.query(query, params);
        res.json({
            count: result.rows.length,
            weapons: result.rows
        });
    } catch (error) {
        console.error('Error fetching weapons:', error);
        res.status(500).json({ error: 'Failed to fetch weapons', details: error.message });
    }
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
