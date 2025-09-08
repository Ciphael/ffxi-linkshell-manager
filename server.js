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

// Add these endpoints to your existing server.js file

// ============ USER MANAGEMENT ============

// Register new user
app.post('/api/users/register', async (req, res) => {
    try {
        const { character_name, discord_username, email } = req.body;
        
        const result = await pool.query(
            `INSERT INTO users (character_name, discord_username, email, role) 
             VALUES ($1, $2, $3, 'member') 
             RETURNING *`,
            [character_name, discord_username, email]
        );
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.*, 
                    COALESCE(SUM(up.current_points), 0) as total_points
             FROM users u
             LEFT JOIN user_points up ON u.id = up.user_id
             WHERE u.is_active = true
             GROUP BY u.id
             ORDER BY u.character_name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user points
app.get('/api/users/:userId/points', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT pc.category_name, 
                    COALESCE(up.current_points, 0) as current_points,
                    COALESCE(up.lifetime_earned, 0) as lifetime_earned,
                    COALESCE(up.lifetime_spent, 0) as lifetime_spent
             FROM point_categories pc
             LEFT JOIN user_points up ON pc.id = up.category_id AND up.user_id = $1
             ORDER BY pc.category_name`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ error: 'Failed to fetch user points' });
    }
});

// ============ EVENT MANAGEMENT ============

// Create new event
app.post('/api/events', async (req, res) => {
    try {
        const {
            event_name,
            event_type,
            event_date,
            duration_minutes,
            description,
            meeting_location,
            max_participants,
            base_points,
            targets, // Array of mob names
            created_by
        } = req.body;
        
        // Start transaction
        await pool.query('BEGIN');
        
        // Create event
        const eventResult = await pool.query(
            `INSERT INTO events (
                event_name, event_type, event_date, duration_minutes,
                description, meeting_location, max_participants, base_points,
                created_by, raid_leader
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
            RETURNING *`,
            [event_name, event_type, event_date, duration_minutes || 120,
             description, meeting_location, max_participants || 18, 
             base_points || 10, created_by]
        );
        
        const eventId = eventResult.rows[0].id;
        
        // Add targets if provided
        if (targets && targets.length > 0) {
            for (let i = 0; i < targets.length; i++) {
                await pool.query(
                    `INSERT INTO event_targets (event_id, mob_name, planned_order)
                     VALUES ($1, $2, $3)`,
                    [eventId, targets[i], i + 1]
                );
            }
        }
        
        await pool.query('COMMIT');
        res.json({ success: true, event: eventResult.rows[0] });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get upcoming events
app.get('/api/events/upcoming', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, 
                    u.character_name as raid_leader_name,
                    COUNT(DISTINCT ep.user_id) as registered_count,
                    array_agg(DISTINCT et.mob_name) as targets
             FROM events e
             LEFT JOIN users u ON e.raid_leader = u.id
             LEFT JOIN event_participants ep ON e.id = ep.event_id
             LEFT JOIN event_targets et ON e.id = et.event_id
             WHERE e.event_date >= NOW() AND e.status = 'scheduled'
             GROUP BY e.id, u.character_name
             ORDER BY e.event_date`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Register for event
app.post('/api/events/:eventId/register', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { user_id, job, party_role } = req.body;
        
        const result = await pool.query(
            `INSERT INTO event_participants (event_id, user_id, job, party_role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (event_id, user_id) 
             DO UPDATE SET job = $3, party_role = $4, registration_status = 'registered'
             RETURNING *`,
            [eventId, user_id, job, party_role]
        );
        
        res.json({ success: true, registration: result.rows[0] });
    } catch (error) {
        console.error('Error registering for event:', error);
        res.status(500).json({ error: 'Failed to register for event' });
    }
});

// Get event participants
app.get('/api/events/:eventId/participants', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const result = await pool.query(
            `SELECT ep.*, u.character_name, u.role as user_role
             FROM event_participants ep
             JOIN users u ON ep.user_id = u.id
             WHERE ep.event_id = $1
             ORDER BY ep.registered_at`,
            [eventId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// Mark attendance
app.post('/api/events/:eventId/attendance', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { user_id, attended } = req.body;
        
        await pool.query(
            `UPDATE event_participants 
             SET attended = $3, arrival_time = CASE WHEN $3 THEN NOW() ELSE NULL END
             WHERE event_id = $1 AND user_id = $2`,
            [eventId, user_id, attended]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// Process event completion and award points
app.post('/api/events/:eventId/complete', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Call the stored procedure to process attendance points
        await pool.query('SELECT process_event_attendance($1)', [eventId]);
        
        res.json({ success: true, message: 'Event completed and points awarded' });
    } catch (error) {
        console.error('Error completing event:', error);
        res.status(500).json({ error: 'Failed to complete event' });
    }
});

// ============ DROP MANAGEMENT ============

// Add drop to event
app.post('/api/events/:eventId/drops', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { item_id, item_name, dropped_from, minimum_bid } = req.body;
        
        const result = await pool.query(
            `INSERT INTO event_drops (event_id, item_id, item_name, dropped_from, minimum_bid)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [eventId, item_id, item_name, dropped_from, minimum_bid || 5]
        );
        
        res.json({ success: true, drop: result.rows[0] });
    } catch (error) {
        console.error('Error adding drop:', error);
        res.status(500).json({ error: 'Failed to add drop' });
    }
});

// Get drops for event
app.get('/api/events/:eventId/drops', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const result = await pool.query(
            `SELECT ed.*, u.character_name as won_by_character
             FROM event_drops ed
             LEFT JOIN users u ON ed.won_by = u.id
             WHERE ed.event_id = $1
             ORDER BY ed.dropped_at DESC`,
            [eventId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching drops:', error);
        res.status(500).json({ error: 'Failed to fetch drops' });
    }
});

// Place bid on item
app.post('/api/drops/:dropId/bid', async (req, res) => {
    try {
        const { dropId } = req.params;
        const { user_id, bid_amount } = req.body;
        
        // Check if user has enough points
        const dropResult = await pool.query(
            `SELECT e.event_type FROM event_drops ed
             JOIN events e ON ed.event_id = e.id
             WHERE ed.id = $1`,
            [dropId]
        );
        
        const eventType = dropResult.rows[0].event_type;
        
        const pointsResult = await pool.query(
            `SELECT up.current_points 
             FROM user_points up
             JOIN point_categories pc ON up.category_id = pc.id
             WHERE up.user_id = $1 AND pc.category_name = $2`,
            [user_id, eventType]
        );
        
        const currentPoints = pointsResult.rows[0]?.current_points || 0;
        
        if (currentPoints < bid_amount) {
            return res.status(400).json({ error: 'Insufficient points' });
        }
        
        // Place bid
        const result = await pool.query(
            `INSERT INTO item_bids (drop_id, user_id, bid_amount)
             VALUES ($1, $2, $3)
             ON CONFLICT (drop_id, user_id)
             DO UPDATE SET bid_amount = $3, bid_time = NOW()
             RETURNING *`,
            [dropId, user_id, bid_amount]
        );
        
        res.json({ success: true, bid: result.rows[0] });
    } catch (error) {
        console.error('Error placing bid:', error);
        res.status(500).json({ error: 'Failed to place bid' });
    }
});

// Award item to winner
app.post('/api/drops/:dropId/award', async (req, res) => {
    try {
        const { dropId } = req.params;
        const { winner_id, winning_bid } = req.body;
        
        await pool.query('BEGIN');
        
        // Get drop and event info
        const dropResult = await pool.query(
            `SELECT ed.*, e.event_type, e.event_name 
             FROM event_drops ed
             JOIN events e ON ed.event_id = e.id
             WHERE ed.id = $1`,
            [dropId]
        );
        
        const drop = dropResult.rows[0];
        
        // Update drop with winner
        await pool.query(
            `UPDATE event_drops 
             SET won_by = $2, winning_bid = $3, distributed_at = NOW()
             WHERE id = $1`,
            [dropId, winner_id, winning_bid]
        );
        
        // Update bid as winning
        await pool.query(
            `UPDATE item_bids 
             SET is_winning_bid = true 
             WHERE drop_id = $1 AND user_id = $2`,
            [dropId, winner_id]
        );
        
        // Deduct points
        await pool.query(
            `SELECT add_user_points($1, $2, $3, $4, $5)`,
            [winner_id, drop.event_type, -winning_bid, drop.event_id, 
             `Won ${drop.item_name} for ${winning_bid} points`]
        );
        
        await pool.query('COMMIT');
        res.json({ success: true });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error awarding item:', error);
        res.status(500).json({ error: 'Failed to award item' });
    }
});

// ============ WISHLIST ============

// Add to wishlist
app.post('/api/wishlist', async (req, res) => {
    try {
        const { user_id, item_id, item_name, priority, category, max_bid } = req.body;
        
        const result = await pool.query(
            `INSERT INTO user_wishlist (user_id, item_id, item_name, priority, category, max_bid)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id, item_id)
             DO UPDATE SET priority = $4, max_bid = $6
             RETURNING *`,
            [user_id, item_id, item_name, priority || 5, category, max_bid]
        );
        
        res.json({ success: true, wishlist: result.rows[0] });
    } catch (error) {
        console.error('Error updating wishlist:', error);
        res.status(500).json({ error: 'Failed to update wishlist' });
    }
});

// Get user wishlist
app.get('/api/users/:userId/wishlist', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT * FROM user_wishlist 
             WHERE user_id = $1 
             ORDER BY priority DESC, added_at`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});

// ============ REPORTS AND STATISTICS ============

// Get DKP standings for a category
app.get('/api/points/standings/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        const result = await pool.query(
            `SELECT u.character_name, u.role,
                    COALESCE(up.current_points, 0) as current_points,
                    COALESCE(up.lifetime_earned, 0) as lifetime_earned,
                    COALESCE(up.lifetime_spent, 0) as lifetime_spent,
                    RANK() OVER (ORDER BY COALESCE(up.current_points, 0) DESC) as rank
             FROM users u
             LEFT JOIN user_points up ON u.id = up.user_id
             LEFT JOIN point_categories pc ON up.category_id = pc.id
             WHERE pc.category_name = $1 OR $1 = 'all'
             ORDER BY current_points DESC`,
            [category]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching standings:', error);
        res.status(500).json({ error: 'Failed to fetch standings' });
    }
});

// Get recent point transactions
app.get('/api/points/transactions', async (req, res) => {
    try {
        const { user_id, limit = 50 } = req.query;
        
        let query = `
            SELECT pt.*, 
                   u.character_name,
                   pc.category_name,
                   e.event_name,
                   ed.item_name
            FROM point_transactions pt
            JOIN users u ON pt.user_id = u.id
            LEFT JOIN point_categories pc ON pt.category_id = pc.id
            LEFT JOIN events e ON pt.event_id = e.id
            LEFT JOIN event_drops ed ON pt.drop_id = ed.id
        `;
        
        const params = [];
        if (user_id) {
            query += ' WHERE pt.user_id = $1';
            params.push(user_id);
        }
        
        query += ' ORDER BY pt.created_at DESC LIMIT  + (params.length + 1);
        params.push(limit);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get event history
app.get('/api/events/history', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const result = await pool.query(
            `SELECT e.*,
                    u.character_name as raid_leader_name,
                    COUNT(DISTINCT ep.user_id) as total_participants,
                    COUNT(DISTINCT ed.id) as total_drops,
                    SUM(ed.winning_bid) as total_points_spent
             FROM events e
             LEFT JOIN users u ON e.raid_leader = u.id
             LEFT JOIN event_participants ep ON e.id = ep.event_id AND ep.attended = true
             LEFT JOIN event_drops ed ON e.id = ed.event_id AND ed.won_by IS NOT NULL
             WHERE e.status = 'completed'
             GROUP BY e.id, u.character_name
             ORDER BY e.event_date DESC
             LIMIT $1`,
            [limit]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching event history:', error);
        res.status(500).json({ error: 'Failed to fetch event history' });
    }
});

// Get potential drops for an event type (from mob_droplist)
app.get('/api/events/potential-drops/:eventType', async (req, res) => {
    try {
        const { eventType } = req.params;
        
        // This query would need to be adjusted based on how you map event types to mobs
        // For now, returning a placeholder structure
        const query = `
            SELECT DISTINCT 
                ie.itemid as item_id,
                ie.name as item_name,
                'Unknown' as mob_name,
                0 as drop_rate
            FROM item_equipment ie
            WHERE ie.level >= 70
            LIMIT 50
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching potential drops:', error);
        res.status(500).json({ error: 'Failed to fetch potential drops' });
    }
});

// ============ ADMIN FUNCTIONS ============

// Manually adjust points
app.post('/api/admin/points/adjust', async (req, res) => {
    try {
        const { user_id, category, amount, reason, adjusted_by } = req.body;
        
        await pool.query(
            `SELECT add_user_points($1, $2, $3, NULL, $4)`,
            [user_id, category, amount, reason || 'Manual adjustment']
        );
        
        res.json({ success: true, message: 'Points adjusted successfully' });
    } catch (error) {
        console.error('Error adjusting points:', error);
        res.status(500).json({ error: 'Failed to adjust points' });
    }
});

// Update user role
app.put('/api/admin/users/:userId/role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        const result = await pool.query(
            `UPDATE users SET role = $2, updated_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
            [userId, role]
        );
        
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

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
