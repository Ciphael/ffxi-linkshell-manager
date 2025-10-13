const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
    origin: [
        'https://ffxi-linkshell-manager-frontend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5500',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
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

// ============ HELPER FUNCTIONS ============

// Helper: Generate transaction ID in format [A/R/B/S]YYYYMMDD[E/M][AA][BB]NNNNNN
// Example: S20251010ESKBY000001 (20 characters)
// TransactionType(1) + Date(8) + Type(1) + Area(2) + Boss(2) + Autonumber(6)
// Transaction Types: A=Add, R=Remove, B=Buy, S=Sell
async function generateTransactionId(transactionType, eventDate, eventType, mobName) {
    // Validate transaction type
    if (!['A', 'R', 'B', 'S'].includes(transactionType)) {
        throw new Error(`Invalid transaction type: ${transactionType}. Must be A, R, B, or S.`);
    }

    // Format date: YYYYMMDD
    const dateObj = new Date(eventDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Type code: E for event, M for manual
    const typeCode = 'E';

    // Area code mapping
    const areaCodeMap = {
        'Sky': 'SK',
        'Sea': 'SE',
        'Dynamis': 'DY',
        'Limbus': 'LI',
        'HENM': 'HE'
    };
    const areaCode = areaCodeMap[eventType] || 'XX';

    // Boss code: First 2 chars of boss name, uppercase, alphanumeric only
    const bossCode = mobName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 2)
        .padEnd(2, 'X');

    // Build prefix for querying existing transaction IDs (include transaction type)
    const prefix = `${transactionType}${dateStr}${typeCode}${areaCode}`;

    // Query for the highest autonumber with this prefix
    const result = await pool.query(
        `SELECT transaction_id FROM planned_event_drops
         WHERE transaction_id LIKE $1 || '%'
         ORDER BY transaction_id DESC
         LIMIT 1`,
        [prefix]
    );

    let autonumber = 1;
    if (result.rows.length > 0) {
        // Extract the last 6 digits and increment
        const lastId = result.rows[0].transaction_id;
        const lastNumber = parseInt(lastId.substring(14)); // Position 14-19 is the autonumber (6 digits)
        autonumber = lastNumber + 1;
    }

    // Format autonumber as 6 digits
    const autonumberStr = String(autonumber).padStart(6, '0');

    return `${transactionType}${dateStr}${typeCode}${areaCode}${bossCode}${autonumberStr}`;
}

// Helper: Create planned drops for a boss based on mob_droplist and item_classifications
async function createPlannedDropsForBoss(eventId, eventBossId, mobDropId) {
    try {
        // Get drops from mob_droplist with item classifications
        // Include Marketable, Money Items, and Pop Items
        const dropsQuery = `
            SELECT
                md.itemId,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                md.itemRate,
                md.dropType,
                md.groupId,
                md.groupRate,
                ic.classification,
                ic.estimated_value
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
            LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            WHERE md.dropId = $1
            AND COALESCE(ic.classification, 'Marketable') IN ('Marketable', 'Money Item', 'Pop Item')
            ORDER BY md.itemRate DESC
        `;

        const dropsResult = await pool.query(dropsQuery, [mobDropId]);

        // Insert planned drops
        for (const drop of dropsResult.rows) {
            await pool.query(
                `INSERT INTO planned_event_drops (
                    event_id, event_boss_id, item_id, item_name,
                    drop_rate, classification, expected_value, groupid, grouprate
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    eventId,
                    eventBossId,
                    drop.itemid,
                    drop.item_name,
                    drop.itemrate > 100 ? drop.itemrate / 10 : drop.itemrate,
                    drop.classification || 'Marketable',
                    drop.estimated_value || 0,
                    drop.groupid || 0,
                    drop.grouprate || 1000
                ]
            );
        }
    } catch (error) {
        console.error('Error creating planned drops:', error);
        throw error;
    }
}

// ============ BOSS DROP CONFIGURATION ============

// Get boss drop configuration
app.get('/api/boss/:mobDropId/drop-config', async (req, res) => {
    try {
        const { mobDropId } = req.params;
        
        const query = `
            SELECT * FROM boss_drop_config 
            WHERE mob_dropid = $1
            ORDER BY drop_rate DESC, item_name
        `;
        
        const result = await pool.query(query, [mobDropId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching boss config:', error);
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// Save boss drop configuration
app.post('/api/boss/:mobDropId/drop-config', async (req, res) => {
    try {
        const { mobDropId } = req.params;
        const { configs } = req.body;
        
        await pool.query('BEGIN');
        
        // Clear existing config for this boss
        await pool.query('DELETE FROM boss_drop_config WHERE mob_dropid = $1', [mobDropId]);
        
        // Insert new configurations
        for (const config of configs) {
            await pool.query(
                `INSERT INTO boss_drop_config 
                 (mob_dropid, item_name, drop_rate, min_points, max_quantity, always_drops)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [mobDropId, config.item_name, config.drop_rate, 
                 config.min_points, config.max_quantity, config.always_drops]
            );
        }
        
        await pool.query('COMMIT');
        res.json({ success: true });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error saving boss config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Add boss to event (with quantity support - creates separate instances)
app.post('/api/events/:eventId/bosses', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { mob_dropid, mob_name, quantity } = req.body;

        await pool.query('BEGIN');

        // Get the next boss_order for this event
        const orderResult = await pool.query(
            'SELECT COALESCE(MAX(boss_order), -1) + 1 as next_order FROM event_bosses WHERE event_id = $1',
            [eventId]
        );
        let bossOrder = orderResult.rows[0].next_order;

        const createdBosses = [];
        const qty = quantity || 1;

        // Create separate boss instances for each quantity
        for (let i = 0; i < qty; i++) {
            const result = await pool.query(
                `INSERT INTO event_bosses (event_id, mob_dropid, mob_name, killed, quantity, boss_order)
                 VALUES ($1, $2, $3, false, 1, $4)
                 RETURNING *`,
                [eventId, mob_dropid, mob_name, bossOrder + i]
            );

            const boss = result.rows[0];

            // Auto-create planned drops from mob_droplist and item_classifications
            await createPlannedDropsForBoss(eventId, boss.id, mob_dropid);

            createdBosses.push(boss);
        }

        await pool.query('COMMIT');
        res.json({ success: true, bosses: createdBosses });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error adding boss:', error);
        res.status(500).json({ error: 'Failed to add boss' });
    }
});

// Get bosses for event
app.get('/api/events/:eventId/bosses', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM event_bosses WHERE event_id = $1 ORDER BY id',
            [eventId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bosses:', error);
        res.status(500).json({ error: 'Failed to fetch bosses' });
    }
});

// Update boss status (killed/not killed)
app.put('/api/bosses/:bossId/status', async (req, res) => {
    try {
        const { bossId } = req.params;
        const { killed } = req.body;
        
        await pool.query(
            'UPDATE event_bosses SET killed = $2 WHERE id = $1',
            [bossId, killed]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating boss status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Remove boss from event
app.delete('/api/bosses/:bossId', async (req, res) => {
    try {
        const { bossId } = req.params;

        await pool.query('BEGIN');

        // Delete all uncommitted planned drops for this boss
        await pool.query(
            'DELETE FROM planned_event_drops WHERE event_boss_id = $1 AND committed = FALSE',
            [bossId]
        );

        // Check if there are any committed drops
        const committedDrops = await pool.query(
            'SELECT COUNT(*) as count FROM planned_event_drops WHERE event_boss_id = $1 AND committed = TRUE',
            [bossId]
        );

        if (committedDrops.rows[0].count > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                error: 'Cannot delete boss with committed drops. This boss has been killed and drops have been allocated.'
            });
        }

        // Delete the boss
        await pool.query('DELETE FROM event_bosses WHERE id = $1', [bossId]);

        await pool.query('COMMIT');

        res.json({ success: true });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error removing boss:', error);
        res.status(500).json({ error: 'Failed to remove boss' });
    }
});

// ============ MARKET RATES MANAGEMENT ============

// Get all items from all bosses with their rates and boss info
app.get('/api/market-rates', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT ON (md.itemId, m.mob_name)
                md.itemId as item_id,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                ic.classification,
                ic.points_required,
                ic.market_rate,
                ic.estimated_value,
                ic.convertible,
                ic.converts_to_item_name,
                COALESCE(m.mob_name, 'Unknown Boss') as mob_name,
                ib.is_rare,
                ib.is_ex
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
            LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            LEFT JOIN mobs m ON md.dropId = m.dropid
            WHERE md.dropType IN (0, 1, 4) AND m.mob_name IS NOT NULL
            ORDER BY m.mob_name, md.itemId, COALESCE(ie.name, iw.name, ib.name)
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching market rates:', error);
        res.status(500).json({ error: 'Failed to fetch market rates' });
    }
});

// Update market rates for items
app.put('/api/market-rates/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { classification, points_required, market_rate } = req.body;

        console.log(`Updating item ${itemId}: classification=${classification}, points=${points_required}, rate=${market_rate}`);

        // Check if item exists in item_classifications
        const checkQuery = `SELECT item_id FROM item_classifications WHERE item_id = $1`;
        const checkResult = await pool.query(checkQuery, [itemId]);

        if (checkResult.rows.length > 0) {
            // Update existing
            console.log(`Updating existing item ${itemId}`);
            await pool.query(
                `UPDATE item_classifications
                 SET classification = $2, points_required = $3, market_rate = $4
                 WHERE item_id = $1`,
                [itemId, classification, points_required, market_rate]
            );
        } else {
            // Insert new - need to get item name first
            console.log(`Inserting new item ${itemId}`);
            const itemNameQuery = `
                SELECT COALESCE(ie.name, iw.name, ib.name) as item_name
                FROM (SELECT $1::integer as itemid) i
                LEFT JOIN item_equipment ie ON i.itemid = ie.itemid
                LEFT JOIN item_weapon iw ON i.itemid = iw.itemid
                LEFT JOIN item_basic ib ON i.itemid = ib.itemid
            `;
            const itemNameResult = await pool.query(itemNameQuery, [itemId]);
            const itemName = itemNameResult.rows[0]?.item_name || 'Unknown Item';
            console.log(`Item name for ${itemId}: ${itemName}`);

            await pool.query(
                `INSERT INTO item_classifications (item_id, item_name, classification, points_required, market_rate)
                 VALUES ($1, $2, $3, $4, $5)`,
                [itemId, itemName, classification, points_required, market_rate]
            );
        }

        console.log(`Successfully updated item ${itemId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating market rates:', error);
        console.error('Error details:', error.stack);
        res.status(500).json({ error: 'Failed to update market rates', details: error.message });
    }
});

// ============ PLANNED EVENT DROPS (NEW WORKFLOW) ============

// Get planned drops for an event boss
app.get('/api/bosses/:bossId/planned-drops', async (req, res) => {
    try {
        const { bossId } = req.params;

        const query = `
            SELECT
                ped.*,
                u.character_name as assigned_character_name,
                ic.points_required,
                ic.market_rate,
                ic.convertible,
                ic.converts_to_item_name,
                ib.is_rare,
                ib.is_ex
            FROM planned_event_drops ped
            LEFT JOIN users u ON ped.won_by = u.id
            LEFT JOIN item_classifications ic ON ped.item_id = ic.item_id
            LEFT JOIN item_basic ib ON ped.item_id = ib.itemid
            WHERE ped.event_boss_id = $1
            ORDER BY ped.drop_rate DESC, ped.item_name
        `;

        const result = await pool.query(query, [bossId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching planned drops:', error);
        res.status(500).json({ error: 'Failed to fetch planned drops' });
    }
});

// Update planned drop pre-configuration (auto-save)
app.put('/api/planned-drops/:dropId', async (req, res) => {
    try {
        const { dropId } = req.params;
        const { allocation_type, won_by, external_buyer, expected_value } = req.body;

        console.log(`[PUT /api/planned-drops/${dropId}] Request received:`, {
            allocation_type,
            won_by,
            external_buyer,
            expected_value
        });

        // Convert empty strings to null
        const wonByValue = won_by === '' || won_by === 'null' || won_by === null ? null :
                          (typeof won_by === 'string' && won_by !== '' ? parseInt(won_by) : won_by);
        const expectedValueNum = expected_value ? parseInt(expected_value) : 0;

        console.log(`[PUT /api/planned-drops/${dropId}] Parsed values:`, {
            wonByValue,
            expectedValueNum
        });

        const query = `
            UPDATE planned_event_drops
            SET allocation_type = $2,
                won_by = $3,
                external_buyer = $4,
                expected_value = $5
            WHERE id = $1 AND committed = FALSE
            RETURNING *
        `;

        const result = await pool.query(query, [
            dropId,
            allocation_type || null,
            wonByValue,
            external_buyer || null,
            expectedValueNum
        ]);

        if (result.rows.length === 0) {
            console.log(`[PUT /api/planned-drops/${dropId}] No rows updated - drop not found or committed`);
            return res.status(400).json({ error: 'Cannot update committed drops or drop not found' });
        }

        console.log(`[PUT /api/planned-drops/${dropId}] Successfully updated`);
        res.json({ success: true, drop: result.rows[0] });
    } catch (error) {
        console.error(`[PUT /api/planned-drops/${dropId}] ERROR:`, error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to update planned drop', details: error.message });
    }
});

// Get all drops for mob_droplist (for "Boss Killed" modal)
app.get('/api/mob-droplist/:mobDropId/all-drops', async (req, res) => {
    try {
        const { mobDropId } = req.params;

        const query = `
            SELECT
                md.itemId,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                md.itemRate,
                md.dropType,
                md.groupId,
                md.groupRate,
                ic.classification,
                ic.estimated_value,
                ic.points_required,
                ic.market_rate,
                ic.convertible,
                ic.converts_to_item_name,
                ib.is_rare,
                ib.is_ex
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
            LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            LEFT JOIN item_classifications ic ON md.itemId = ic.item_id
            WHERE md.dropId = $1
            ORDER BY md.dropType, md.groupId, md.itemRate DESC
        `;

        const result = await pool.query(query, [mobDropId]);

        const formattedDrops = result.rows.map(drop => ({
            ...drop,
            displayRate: drop.itemrate > 100 ?
                `${(drop.itemrate / 10).toFixed(1)}%` :
                `${drop.itemrate}%`,
            classification: drop.classification || 'Marketable',
            points_required: drop.points_required || 0,
            market_rate: drop.market_rate || 0
        }));

        res.json(formattedDrops);
    } catch (error) {
        console.error('Error fetching all mob drops:', error);
        res.status(500).json({ error: 'Failed to fetch drops' });
    }
});

// Confirm drops for a killed boss
app.post('/api/bosses/:bossId/confirm-drops', async (req, res) => {
    try {
        const { bossId } = req.params;
        const { confirmedDrops } = req.body; // Array of drop objects

        await pool.query('BEGIN');

        // Get event info, date, and boss details for this boss
        const bossInfo = await pool.query(
            `SELECT eb.event_id, eb.mob_dropid, eb.mob_name, e.event_date, e.event_type
             FROM event_bosses eb
             JOIN events e ON eb.event_id = e.id
             WHERE eb.id = $1`,
            [bossId]
        );

        if (bossInfo.rows.length === 0) {
            throw new Error('Boss not found');
        }

        const { event_id, mob_dropid, mob_name, event_date, event_type } = bossInfo.rows[0];

        // Count how many bosses with the same name have already been killed in this event
        const bossCountResult = await pool.query(
            `SELECT COUNT(*) + 1 as boss_number
             FROM event_bosses
             WHERE event_id = $1 AND mob_name = $2 AND id <= $3`,
            [event_id, mob_name, bossId]
        );
        const bossNumber = parseInt(bossCountResult.rows[0].boss_number);

        // Update or insert confirmed drops
        for (const drop of confirmedDrops) {
            // Determine transaction type based on allocation
            let transactionType;
            if (drop.allocation_type === 'external') {
                transactionType = 'S'; // Sell - external buyer sales
            } else if (drop.classification === 'Pop Item' || drop.classification === 'Money Item' || drop.allocation_type === 'ls_store') {
                transactionType = 'A'; // Add - items going to LS inventory
            } else {
                transactionType = 'A'; // Default to Add
            }

            // Generate unique transaction ID for this drop
            const transactionId = await generateTransactionId(transactionType, event_date, event_type, mob_name);
            // Check if this drop was pre-planned
            const existingDrop = await pool.query(
                `SELECT id FROM planned_event_drops
                 WHERE event_boss_id = $1 AND item_id = $2`,
                [bossId, drop.item_id]
            );

            if (existingDrop.rows.length > 0) {
                // Update existing planned drop and mark as committed
                await pool.query(
                    `UPDATE planned_event_drops
                     SET confirmed_dropped = true,
                         committed = true,
                         actual_dropped_at = NOW(),
                         allocation_type = $3,
                         won_by = $4,
                         winning_bid = $5,
                         external_buyer = $6,
                         sell_value = $7,
                         ls_fund_category = $8,
                         transaction_id = $9
                     WHERE id = $1 AND event_boss_id = $2`,
                    [
                        existingDrop.rows[0].id,
                        bossId,
                        drop.allocation_type || 'unassigned',
                        drop.won_by || null,
                        drop.winning_bid || 0,
                        drop.external_buyer || null,
                        drop.sell_value || 0,
                        drop.ls_fund_category || null,
                        transactionId
                    ]
                );
            } else {
                // Insert new drop (wasn't pre-planned) and mark as committed
                await pool.query(
                    `INSERT INTO planned_event_drops (
                        event_id, event_boss_id, item_id, item_name,
                        confirmed_dropped, committed, actual_dropped_at,
                        allocation_type, won_by, winning_bid,
                        external_buyer, sell_value, ls_fund_category,
                        classification, transaction_id
                    ) VALUES ($1, $2, $3, $4, true, true, NOW(), $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        event_id,
                        bossId,
                        drop.item_id,
                        drop.item_name,
                        drop.allocation_type || 'unassigned',
                        drop.won_by || null,
                        drop.winning_bid || 0,
                        drop.external_buyer || null,
                        drop.sell_value || 0,
                        drop.ls_fund_category || null,
                        drop.classification || 'Marketable',
                        transactionId
                    ]
                );
            }

            // Deduct points if won by LS member
            if (drop.won_by && drop.winning_bid > 0) {
                const eventResult = await pool.query(
                    'SELECT event_type FROM events WHERE id = $1',
                    [event_id]
                );
                const eventType = eventResult.rows[0].event_type;

                const catResult = await pool.query(
                    'SELECT id FROM point_categories WHERE category_name = $1',
                    [eventType]
                );

                if (catResult.rows[0]) {
                    const categoryId = catResult.rows[0].id;

                    await pool.query(
                        `UPDATE user_points
                         SET current_points = current_points - $3,
                             lifetime_spent = lifetime_spent + $3
                         WHERE user_id = $1 AND category_id = $2`,
                        [drop.won_by, categoryId, drop.winning_bid]
                    );

                    await pool.query(
                        `INSERT INTO point_transactions (
                            user_id, category_id, points_change, event_id, description, transaction_id
                        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [drop.won_by, categoryId, -drop.winning_bid, event_id,
                         `Won ${drop.item_name} for ${drop.winning_bid} points`, transactionId]
                    );
                }
            }

            // Create LS Bank transaction for external buyer sales
            if (drop.allocation_type === 'external' && drop.external_buyer && drop.sell_value > 0) {
                await pool.query(
                    `INSERT INTO ls_bank_transactions (
                        transaction_type, item_id, item_name, amount, description,
                        recorded_by, event_id, source, status, transaction_id
                    ) VALUES ('sale', $1, $2, $3, $4, $5, $6, 'Event Drop', 'completed', $7)`,
                    [
                        drop.item_id,
                        drop.item_name,
                        drop.sell_value,
                        `Sold ${drop.item_name} to ${drop.external_buyer} (${mob_name})`,
                        drop.won_by || null,
                        event_id,
                        transactionId
                    ]
                );
            }

            // Auto-insert Pop Items, Money Items, and LS Store items to LS Bank (ls_shop_inventory)
            if (drop.classification === 'Pop Item' || drop.classification === 'Money Item' || drop.allocation_type === 'ls_store') {
                // Get event name for source details
                const eventNameResult = await pool.query(
                    'SELECT event_name FROM events WHERE id = $1',
                    [event_id]
                );
                const eventName = eventNameResult.rows[0]?.event_name || 'Unknown Event';

                // Format source details: "Event Name - Boss Name/Instance #"
                const sourceDetails = `${eventName} - ${mob_name}/${bossNumber}`;

                // Determine status based on classification
                // Note: itemStatus is for ls_shop_inventory (allows: 'pending_sale', 'sold', 'in_use', 'Event Item')
                const itemStatus = drop.classification === 'Pop Item' ? 'Event Item' : 'Pending Sale';

                // Insert into ls_shop_inventory
                await pool.query(
                    `INSERT INTO ls_shop_inventory (
                        item_id, item_name, quantity, added_by, owner_user_id,
                        event_id, source, source_details, transaction_id, status
                    ) VALUES ($1, $2, 1, $3, $4, $5, 'Event Drop', $6, $7, $8)`,
                    [drop.item_id, drop.item_name, drop.won_by, drop.won_by, event_id, sourceDetails, transactionId, itemStatus]
                );

                // Create corresponding transaction in ls_bank_transactions
                // Note: ls_bank_transactions.status CHECK allows only ('completed', 'on_hold')
                await pool.query(
                    `INSERT INTO ls_bank_transactions (
                        transaction_type, item_id, item_name, amount, description,
                        recorded_by, event_id, source, status, transaction_id
                    ) VALUES ('add', $1, $2, 0, $3, $4, $5, 'Event Drop', 'completed', $6)`,
                    [
                        drop.item_id,
                        drop.item_name,
                        `Added ${drop.item_name} to LS Bank from ${mob_name} (${eventName})`,
                        drop.won_by || null,
                        event_id,
                        transactionId
                    ]
                );
            }
        }

        // Mark boss as killed
        await pool.query(
            'UPDATE event_bosses SET killed = true, completed_at = NOW() WHERE id = $1',
            [bossId]
        );

        await pool.query('COMMIT');
        res.json({ success: true, message: 'Drops confirmed successfully' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error confirming drops:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get LS funds summary
app.get('/api/ls-funds', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM ls_funds ORDER BY category'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching LS funds:', error);
        res.status(500).json({ error: 'Failed to fetch LS funds' });
    }
});

// Allocate LS funds
app.post('/api/ls-funds/allocate', async (req, res) => {
    try {
        const { from_category, to_category, amount, description, created_by } = req.body;

        await pool.query('BEGIN');

        // Deduct from source
        await pool.query(
            'UPDATE ls_funds SET amount = amount - $2, updated_at = NOW() WHERE category = $1',
            [from_category, amount]
        );

        // Add to destination
        await pool.query(
            'UPDATE ls_funds SET amount = amount + $2, updated_at = NOW() WHERE category = $1',
            [to_category, amount]
        );

        // Record transactions
        await pool.query(
            `INSERT INTO ls_fund_transactions (
                fund_category, amount, transaction_type, description, created_by
            ) VALUES ($1, $2, 'withdrawal', $3, $4)`,
            [from_category, amount, description, created_by]
        );

        await pool.query(
            `INSERT INTO ls_fund_transactions (
                fund_category, amount, transaction_type, description, created_by
            ) VALUES ($1, $2, 'deposit', $3, $4)`,
            [to_category, amount, description, created_by]
        );

        await pool.query('COMMIT');
        res.json({ success: true });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error allocating funds:', error);
        res.status(500).json({ error: 'Failed to allocate funds' });
    }
});

// Get mobs for an event based on zone
app.get('/api/events/:eventId/zone-mobs', async (req, res) => {
    try {
        const { eventId } = req.params;

        // Get event type to determine zone category
        const eventResult = await pool.query(
            'SELECT event_type FROM events WHERE id = $1',
            [eventId]
        );

        const eventType = eventResult.rows[0]?.event_type;

        // Get mobs from zones matching this event type
        const query = `
            SELECT m.dropId, m.mob_name, z.zone_name, m.mob_type, m.mob_level
            FROM mobs m
            JOIN zones z ON m.zone_id = z.id
            WHERE z.zone_category = UPPER($1)
            ORDER BY z.zone_name, m.mob_name
        `;

        const result = await pool.query(query, [eventType || 'SKY']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching zone mobs:', error);
        res.status(500).json({ error: 'Failed to fetch mobs' });
    }
});

// Get drops for a specific mob using dropId
app.get('/api/mobs/:dropId/drops', async (req, res) => {
    try {
        const { dropId } = req.params;
        
        const query = `
            SELECT 
                md.itemId,
                COALESCE(ie.name, iw.name, ib.name, 'Unknown Item') as item_name,
                md.itemRate,
                md.dropType,
                md.groupId,
                md.groupRate
            FROM mob_droplist md
            LEFT JOIN item_equipment ie ON md.itemId = ie.itemid
            LEFT JOIN item_weapon iw ON md.itemId = iw.itemid
            LEFT JOIN item_basic ib ON md.itemId = ib.itemid
            WHERE md.dropId = $1
            ORDER BY md.dropType, md.groupId, md.itemRate DESC
        `;
        
        const result = await pool.query(query, [dropId]);
        
        // Format the drop rates for display
        const formattedDrops = result.rows.map(drop => ({
            ...drop,
            displayRate: drop.itemrate > 100 ? 
                `${(drop.itemrate / 10).toFixed(1)}%` : 
                `${drop.itemrate}%`
        }));
        
        res.json(formattedDrops);
    } catch (error) {
        console.error('Error fetching mob drops:', error);
        res.status(500).json({ error: 'Failed to fetch drops' });
    }
});

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
            targets,
            created_by
        } = req.body;
        
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
                    array_agg(DISTINCT et.mob_name) FILTER (WHERE et.mob_name IS NOT NULL) as targets
             FROM events e
             LEFT JOIN users u ON e.raid_leader = u.id
             LEFT JOIN event_participants ep ON e.id = ep.event_id
             LEFT JOIN event_targets et ON e.id = et.event_id
             WHERE e.event_date >= NOW() AND e.status = 'scheduled'
             GROUP BY e.id, u.character_name
             ORDER BY e.event_date`
        );
        
        res.json(result.rows || []);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
});

// Get single event details
app.get('/api/events/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const result = await pool.query(
            `SELECT e.*, 
                    u.character_name as raid_leader_name
             FROM events e
             LEFT JOIN users u ON e.raid_leader = u.id
             WHERE e.id = $1`,
            [eventId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
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
        
        await pool.query('BEGIN');
        
        // Get event details
        const eventResult = await pool.query(
            'SELECT * FROM events WHERE id = $1',
            [eventId]
        );
        
        if (eventResult.rows.length === 0) {
            throw new Error('Event not found');
        }
        
        const event = eventResult.rows[0];
        
        // Get all attended participants
        const participantsResult = await pool.query(
            'SELECT user_id FROM event_participants WHERE event_id = $1 AND attended = true',
            [eventId]
        );
        
        // Get category and points value
        const catResult = await pool.query(
            'SELECT id, points_per_attendance FROM point_categories WHERE category_name = $1',
            [event.event_type]
        );
        
        if (catResult.rows.length === 0) {
            throw new Error(`Point category ${event.event_type} not found`);
        }
        
        const categoryId = catResult.rows[0].id;
        const pointsToAward = catResult.rows[0].points_per_attendance || 1;
        
        // Award points to each attended participant
        for (const participant of participantsResult.rows) {
            // Update or insert user points
            await pool.query(
                `INSERT INTO user_points (user_id, category_id, current_points, lifetime_earned, lifetime_spent)
                 VALUES ($1, $2, $3, $3, 0)
                 ON CONFLICT (user_id, category_id)
                 DO UPDATE SET 
                    current_points = user_points.current_points + $3,
                    lifetime_earned = user_points.lifetime_earned + $3`,
                [participant.user_id, categoryId, pointsToAward]
            );
            
            // Log transaction if table exists
            await pool.query(
                `INSERT INTO point_transactions (
                    user_id, category_id, points_change, event_id, description
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING`,
                [participant.user_id, categoryId, pointsToAward, eventId, `Event attendance: ${event.event_name}`]
            );
        }
        
        // Mark event as completed
        await pool.query(
            `UPDATE events SET status = 'completed' WHERE id = $1`,
            [eventId]
        );
        
        await pool.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: `Event completed! ${participantsResult.rows.length} participants awarded ${pointsToAward} point${pointsToAward > 1 ? 's' : ''} each` 
        });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error completing event:', error);
        res.status(500).json({ 
            error: 'Failed to complete event', 
            details: error.message 
        });
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

// ============ DROP MANAGEMENT ============

// Add drop to event
app.post('/api/events/:eventId/drops', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { 
            item_id, 
            item_name, 
            dropped_from, 
            won_by, 
            winning_bid,
            external_buyer,
            sell_value
        } = req.body;
        
        console.log('Received drop data:', req.body);
        
        await pool.query('BEGIN');
        
        // Insert the drop
        const result = await pool.query(
            `INSERT INTO event_drops (
                event_id, item_id, item_name, dropped_from, 
                won_by, winning_bid, distributed_at,
                external_buyer, sell_value
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [eventId, item_id || 0, item_name, dropped_from, 
             won_by || null, winning_bid || 0, won_by ? new Date() : null,
             external_buyer || null, sell_value || null]
        );
        
        // If won by a player and points were used, deduct them
        if (won_by && winning_bid > 0) {
            // Get event type for category
            const eventResult = await pool.query(
                'SELECT event_type FROM events WHERE id = $1',
                [eventId]
            );
            const eventType = eventResult.rows[0].event_type;
            
            // Get category ID
            const catResult = await pool.query(
                'SELECT id FROM point_categories WHERE category_name = $1',
                [eventType]
            );
            
            if (catResult.rows[0]) {
                const categoryId = catResult.rows[0].id;
                
                // Deduct points from user
                await pool.query(
                    `UPDATE user_points 
                     SET current_points = current_points - $3,
                         lifetime_spent = lifetime_spent + $3
                     WHERE user_id = $1 AND category_id = $2`,
                    [won_by, categoryId, winning_bid]
                );
                
                // Log the transaction
                await pool.query(
                    `INSERT INTO point_transactions (
                        user_id, category_id, points_change, event_id, drop_id, description
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [won_by, categoryId, -winning_bid, eventId, result.rows[0].id, 
                     `Won ${item_name} for ${winning_bid} points`]
                );
            }
        }
        
        await pool.query('COMMIT');
        res.json({ success: true, drop: result.rows[0] });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error adding drop:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get drops for event
app.get('/api/events/:eventId/drops', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const result = await pool.query(
            `SELECT ed.*, 
                    u.character_name as won_by_character,
                    ed.external_buyer,
                    ed.sell_value
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

// Update existing drop with point adjustment
app.put('/api/drops/:dropId', async (req, res) => {
    try {
        const { dropId } = req.params;
        const { winning_bid } = req.body;
        
        await pool.query('BEGIN');
        
        // Get current drop info
        const dropResult = await pool.query(
            `SELECT ed.*, e.event_type 
             FROM event_drops ed
             JOIN events e ON ed.event_id = e.id
             WHERE ed.id = $1`,
            [dropId]
        );
        
        const drop = dropResult.rows[0];
        const oldPoints = drop.winning_bid || 0;
        const newPoints = Math.abs(winning_bid || 0);
        const pointDiff = oldPoints - newPoints;
        
        if (pointDiff !== 0 && drop.won_by) {
            // Get category ID
            const catResult = await pool.query(
                'SELECT id FROM point_categories WHERE category_name = $1',
                [drop.event_type]
            );
            
            if (catResult.rows[0]) {
                // Refund/charge the difference
                await pool.query(
                    `UPDATE user_points 
                     SET current_points = current_points + $3,
                         lifetime_spent = lifetime_spent - $3
                     WHERE user_id = $1 AND category_id = $2`,
                    [drop.won_by, catResult.rows[0].id, pointDiff]
                );
                
                // Log the adjustment
                await pool.query(
                    `INSERT INTO point_transactions (
                        user_id, category_id, points_change, 
                        event_id, drop_id, description
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [drop.won_by, catResult.rows[0].id, pointDiff, 
                     drop.event_id, dropId, 
                     `Point adjustment for ${drop.item_name}: ${oldPoints} → ${newPoints}`]
                );
            }
        }
        
        // Update the drop
        await pool.query(
            'UPDATE event_drops SET winning_bid = $2 WHERE id = $1',
            [dropId, newPoints]
        );
        
        await pool.query('COMMIT');
        res.json({ success: true, oldPoints, newPoints, pointDiff });
        
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating drop:', error);
        res.status(500).json({ error: 'Failed to update drop' });
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

// Get AP standings for a category
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
        
        query += ' ORDER BY pt.created_at DESC LIMIT $' + (params.length + 1);
        params.push(limit);
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get sold items report
app.get('/api/reports/sold-items', async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const query = `
            SELECT 
                ed.item_name,
                ed.dropped_from,
                ed.external_buyer,
                ed.sell_value,
                ed.distributed_at,
                e.event_name,
                e.event_type
            FROM event_drops ed
            JOIN events e ON ed.event_id = e.id
            WHERE ed.external_buyer IS NOT NULL
            ORDER BY ed.distributed_at DESC
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sold items:', error);
        res.status(500).json({ error: 'Failed to fetch sold items' });
    }
});

// ============ ITEM DATABASE ============

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
                ib.is_rare,
                ib.is_ex,
                STRING_AGG(
                    CASE
                        WHEN im.modid IN (355, 356) THEN
                            COALESCE(m.name, 'ADDS_WEAPONSKILL') || ': ' || COALESCE(ws.name, 'Unknown')
                        ELSE
                            COALESCE(m.name, 'Mod' || im.modid) || ': ' ||
                            CASE
                                WHEN im.value > 0 AND COALESCE(m.name, '') NOT IN ('DEF', 'DMG', 'DELAY')
                                THEN '+'
                                ELSE ''
                            END || im.value
                    END,
                    ', ' ORDER BY im.modid
                ) AS stats
            FROM item_equipment ie
            LEFT JOIN item_basic ib ON ie.itemid = ib.itemid
            LEFT JOIN item_mods im ON ie.itemid = im.itemid
            LEFT JOIN mods m ON im.modid = m.modid
            LEFT JOIN weapon_skills ws ON im.modid IN (355, 356) AND im.value = ws.weaponskillid
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
        
        query += ` GROUP BY ie.itemid, ie.name, ie.level, ie.slot, ie.jobs, ib.is_rare, ib.is_ex
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
                ib.is_rare,
                ib.is_ex,
                STRING_AGG(
                    CASE
                        WHEN im.modid IN (355, 356) THEN
                            COALESCE(m.name, 'ADDS_WEAPONSKILL') || ': ' || COALESCE(ws.name, 'Unknown')
                        ELSE
                            COALESCE(m.name, 'Mod' || im.modid) || ': ' ||
                            CASE
                                WHEN im.value > 0 AND COALESCE(m.name, '') NOT IN ('DMG', 'DELAY')
                                THEN '+'
                                ELSE ''
                            END || im.value
                    END,
                    ', ' ORDER BY im.modid
                ) AS additional_stats
            FROM item_weapon iw
            LEFT JOIN item_basic ib ON iw.itemid = ib.itemid
            LEFT JOIN item_mods im ON iw.itemid = im.itemid
            LEFT JOIN mods m ON im.modid = m.modid
            LEFT JOIN weapon_skills ws ON im.modid IN (355, 356) AND im.value = ws.weaponskillid
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
        
        query += ` GROUP BY iw.itemid, iw.name, iw.skill, iw.dmg, iw.delay, ib.is_rare, ib.is_ex
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

// ============ LS BANK ENDPOINTS ============

// Get all bank transactions
app.get('/api/ls-bank/transactions', async (req, res) => {
    try {
        // First check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'ls_bank_transactions'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('ls_bank_transactions table does not exist');
            return res.json([]);
        }

        const result = await pool.query(`
            SELECT
                t.*,
                u.character_name as recorded_by_name,
                u2.character_name as owner_name,
                ic.classification as item_type
            FROM ls_bank_transactions t
            LEFT JOIN users u ON t.recorded_by = u.id
            LEFT JOIN users u2 ON t.owner_user_id = u2.id
            LEFT JOIN item_classifications ic ON t.item_id = ic.item_id
            ORDER BY t.recorded_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching LS bank transactions:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
    }
});

// Get bank balance (total sales minus total purchases, excluding on-hold)
app.get('/api/ls-bank/balance', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_sales,
                COALESCE(SUM(CASE WHEN transaction_type = 'purchase' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_purchases,
                COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount
                                  WHEN transaction_type = 'purchase' AND status = 'completed' THEN -amount
                                  ELSE 0 END), 0) as current_balance,
                COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_count
            FROM ls_bank_transactions
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching LS bank balance:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

// Get LS Bank items (from ls_shop_inventory)
app.get('/api/ls-bank/items', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                i.*,
                ic.classification as type,
                ic.market_rate,
                u.character_name as owner_name,
                e.event_name,
                eb.mob_name
            FROM ls_shop_inventory i
            LEFT JOIN users u ON i.owner_user_id = u.id
            LEFT JOIN item_classifications ic ON i.item_id = ic.item_id
            LEFT JOIN events e ON i.event_id = e.id
            LEFT JOIN event_bosses eb ON i.source_details LIKE CONCAT('%', eb.mob_name, '%')
            WHERE i.quantity > 0
            ORDER BY i.added_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching LS bank items:', error);
        res.status(500).json({ error: 'Failed to fetch LS bank items' });
    }
});

// Add a sale transaction
app.post('/api/ls-bank/sale', async (req, res) => {
    const client = await pool.connect();
    try {
        const { item_id, item_name, amount, description, recorded_by, event_id, source } = req.body;

        await client.query('BEGIN');

        // Generate transaction ID for sale (20 chars total)
        // Format: S[YYYYMMDD]M[XX][XX][000001]
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        const prefix = `S${dateStr}M`;

        // Query for autonumber from ls_bank_transactions (check all transactions from today)
        const countResult = await client.query(
            `SELECT transaction_id FROM ls_bank_transactions
             WHERE transaction_id LIKE '_' || $1 || '%'
             ORDER BY transaction_id DESC
             LIMIT 1`,
            [dateStr]
        );

        let autonumber = 1;
        if (countResult.rows.length > 0) {
            const lastId = countResult.rows[0].transaction_id;
            const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
            autonumber = lastNumber + 1;
        }

        // Format: S[8 digits]M[2 area][2 boss][6 autonumber] = 20 chars
        const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

        const result = await client.query(`
            INSERT INTO ls_bank_transactions
            (transaction_type, item_id, item_name, amount, description, recorded_by, event_id, source, transaction_id)
            VALUES ('sale', $1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [item_id, item_name, amount, description, recorded_by, event_id, source || 'Manual', transactionId]);

        await client.query('COMMIT');
        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding sale:', error);
        res.status(500).json({ error: 'Failed to add sale' });
    } finally {
        client.release();
    }
});

// Add a purchase transaction
app.post('/api/ls-bank/purchase', async (req, res) => {
    const client = await pool.connect();
    try {
        const { item_id, item_name, amount, description, recorded_by, purchaser_id } = req.body;

        await client.query('BEGIN');

        // Generate transaction ID for purchase (20 chars total)
        // Format: A[YYYYMMDD]M[XX][XX][000001]
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        const prefix = `A${dateStr}M`;

        // Query for autonumber from ls_bank_transactions (check all transactions from today)
        const result = await client.query(
            `SELECT transaction_id FROM ls_bank_transactions
             WHERE transaction_id LIKE '_' || $1 || '%'
             ORDER BY transaction_id DESC
             LIMIT 1`,
            [dateStr]
        );

        let autonumber = 1;
        if (result.rows.length > 0) {
            const lastId = result.rows[0].transaction_id;
            const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
            autonumber = lastNumber + 1;
        }

        // Format: A[8 digits]M[2 area][2 boss][6 autonumber] = 20 chars
        const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

        // Get item classification to set appropriate status
        const classificationResult = await client.query(
            'SELECT classification FROM item_classifications WHERE item_id = $1',
            [item_id]
        );
        const classification = classificationResult.rows[0]?.classification || 'Marketable';

        // Determine status based on classification
        const itemStatus = classification === 'Pop Item' ? 'Event Item' : 'pending_sale';

        // Insert into ls_shop_inventory (the actual item)
        const insertResult = await client.query(
            `INSERT INTO ls_shop_inventory (
                item_id, item_name, quantity, added_by, owner_user_id,
                source, source_details, transaction_id, status
            ) VALUES ($1, $2, 1, $3, $4, 'Manual', $5, $6, $7)
            RETURNING *`,
            [item_id, item_name, recorded_by, purchaser_id,
             description || `Purchased ${item_name}`, transactionId, itemStatus]
        );

        // Create corresponding transaction in ls_bank_transactions
        await client.query(
            `INSERT INTO ls_bank_transactions (
                transaction_type, item_id, item_name, amount, description,
                recorded_by, owner_user_id, source, status, transaction_id
            ) VALUES ('purchase', $1, $2, $3, $4, $5, $6, 'Manual', 'completed', $7)`,
            [
                item_id,
                item_name,
                amount,
                description || `Purchased ${item_name} for ${amount} gil`,
                recorded_by,
                purchaser_id,
                transactionId
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, item: insertResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding purchase:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Failed to add purchase', details: error.message });
    } finally {
        client.release();
    }
});

// Manually add item to LS Bank
app.post('/api/ls-bank/add-item', async (req, res) => {
    try {
        const { item_id, item_name, owner_user_id, description, recorded_by } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Generate transaction ID for manual addition (20 chars total)
            // Format: A[YYYYMMDD]M[XX][XX][000001]
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;

            const prefix = `A${dateStr}M`;

            // Query for autonumber from ls_bank_transactions (check all transactions from today)
            const result = await client.query(
                `SELECT transaction_id FROM ls_bank_transactions
                 WHERE transaction_id LIKE '_' || $1 || '%'
                 ORDER BY transaction_id DESC
                 LIMIT 1`,
                [dateStr]
            );

            let autonumber = 1;
            if (result.rows.length > 0) {
                const lastId = result.rows[0].transaction_id;
                const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
                autonumber = lastNumber + 1;
            }

            // Format: A[8 digits]M[2 area][2 boss][6 autonumber] = 20 chars
            const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

            // Get item classification to set appropriate status
            const classificationResult = await client.query(
                'SELECT classification FROM item_classifications WHERE item_id = $1',
                [item_id]
            );
            const classification = classificationResult.rows[0]?.classification || 'Marketable';

            // Determine status based on classification (same logic as boss drops)
            const itemStatus = classification === 'Pop Item' ? 'Event Item' : 'pending_sale';

            // Insert into ls_shop_inventory
            const insertResult = await client.query(
                `INSERT INTO ls_shop_inventory (
                    item_id, item_name, quantity, added_by, owner_user_id,
                    source, source_details, transaction_id, status
                ) VALUES ($1, $2, 1, $3, $4, 'Manual', $5, $6, $7)
                RETURNING *`,
                [item_id, item_name, recorded_by, owner_user_id,
                 description || 'Manually added to LS Bank', transactionId, itemStatus]
            );

            // Create corresponding transaction in ls_bank_transactions
            // Note: ls_bank_transactions.status CHECK allows only ('completed', 'on_hold')
            await client.query(
                `INSERT INTO ls_bank_transactions (
                    transaction_type, item_id, item_name, amount, description,
                    recorded_by, owner_user_id, source, status, transaction_id
                ) VALUES ('add', $1, $2, 0, $3, $4, $5, 'Manual', 'completed', $6)`,
                [
                    item_id,
                    item_name,
                    description || `Manually added ${item_name} to LS Bank`,
                    recorded_by,
                    owner_user_id,
                    transactionId
                ]
            );

            await client.query('COMMIT');
            res.json({ success: true, item: insertResult.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error adding item to LS Bank:', error);
        res.status(500).json({ error: error.message || 'Failed to add item' });
    }
});

// Manually remove item from LS Bank
app.post('/api/ls-bank/remove-item', async (req, res) => {
    try {
        const { shop_item_id, reason, recorded_by } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get item details before removing
            const itemResult = await client.query(
                'SELECT * FROM ls_shop_inventory WHERE shop_item_id = $1',
                [shop_item_id]
            );

            if (itemResult.rows.length === 0) {
                throw new Error('Item not found in LS Bank');
            }

            const item = itemResult.rows[0];

            // Generate transaction ID for manual removal (20 chars total)
            // Format: R[YYYYMMDD]M[XX][XX][000001]
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;

            const prefix = `R${dateStr}M`;

            // Query for autonumber from ls_bank_transactions (check all transactions from today)
            const result = await client.query(
                `SELECT transaction_id FROM ls_bank_transactions
                 WHERE transaction_id LIKE '_' || $1 || '%'
                 ORDER BY transaction_id DESC
                 LIMIT 1`,
                [dateStr]
            );

            let autonumber = 1;
            if (result.rows.length > 0) {
                const lastId = result.rows[0].transaction_id;
                const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
                autonumber = lastNumber + 1;
            }

            // Format: R[8 digits]M[2 area][2 boss][6 autonumber] = 20 chars
            const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

            // Update item to set quantity to 0 and mark as removed
            await client.query(
                `UPDATE ls_shop_inventory
                 SET quantity = 0, status = 'removed'
                 WHERE shop_item_id = $1`,
                [shop_item_id]
            );

            // Create removal transaction in ls_bank_transactions
            await client.query(
                `INSERT INTO ls_bank_transactions (
                    transaction_type, item_id, item_name, amount, description,
                    recorded_by, owner_user_id, source, status, transaction_id
                ) VALUES ('remove', $1, $2, 0, $3, $4, $5, 'Manual', 'completed', $6)`,
                [
                    item.item_id,
                    item.item_name,
                    `Removed ${item.item_name} from LS Bank. Reason: ${reason}`,
                    recorded_by,
                    item.owner_user_id,
                    transactionId
                ]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: 'Item removed successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error removing item from LS Bank:', error);
        res.status(500).json({ error: error.message || 'Failed to remove item' });
    }
});

// Store Money Item (on-hold status)
app.post('/api/ls-bank/store-money-item', async (req, res) => {
    const client = await pool.connect();
    try {
        const { item_id, item_name, owner_user_id, recorded_by, event_id, boss_name, source } = req.body;

        await client.query('BEGIN');

        // Generate transaction ID for on-hold money item (20 chars total)
        // Format: S[YYYYMMDD]M[XX][XX][000001]
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const prefix = `S${dateStr}M`;

        // Query for autonumber from ls_bank_transactions (check all transactions from today)
        const countResult = await client.query(
            `SELECT transaction_id FROM ls_bank_transactions
             WHERE transaction_id LIKE '_' || $1 || '%'
             ORDER BY transaction_id DESC
             LIMIT 1`,
            [dateStr]
        );

        let autonumber = 1;
        if (countResult.rows.length > 0) {
            const lastId = countResult.rows[0].transaction_id;
            const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
            autonumber = lastNumber + 1;
        }

        const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

        const result = await client.query(`
            INSERT INTO ls_bank_transactions
            (transaction_type, item_id, item_name, amount, owner_user_id, recorded_by,
             event_id, boss_name, source, status, description, transaction_id)
            VALUES ('sale', $1, $2, 0, $3, $4, $5, $6, $7, 'on_hold', $8, $9)
            RETURNING *
        `, [item_id, item_name, owner_user_id, recorded_by, event_id, boss_name,
            source || 'Manual', `Money item stored for ${owner_user_id ? 'LS member' : 'future sale'}`,
            transactionId]);

        await client.query('COMMIT');
        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error storing money item:', error);
        res.status(500).json({ error: 'Failed to store money item' });
    } finally {
        client.release();
    }
});

// Get on-hold money items
app.get('/api/ls-bank/on-hold', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                t.*,
                u.character_name as owner_name,
                u2.character_name as recorded_by_name,
                e.name as event_name,
                ic.market_rate
            FROM ls_bank_transactions t
            LEFT JOIN users u ON t.owner_user_id = u.id
            LEFT JOIN users u2 ON t.recorded_by = u2.id
            LEFT JOIN events e ON t.event_id = e.id
            LEFT JOIN item_classifications ic ON t.item_id = ic.item_id
            WHERE t.status = 'on_hold'
            ORDER BY t.recorded_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching on-hold items:', error);
        res.status(500).json({ error: 'Failed to fetch on-hold items' });
    }
});

// Complete money item sale (change from on-hold to completed)
app.post('/api/ls-bank/complete-money-item-sale', async (req, res) => {
    try {
        const { transaction_id, amount } = req.body;

        const result = await pool.query(`
            UPDATE ls_bank_transactions
            SET status = 'completed', amount = $1
            WHERE transaction_id = $2
            RETURNING *
        `, [amount, transaction_id]);

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        console.error('Error completing money item sale:', error);
        res.status(500).json({ error: 'Failed to complete sale' });
    }
});

// Record item sold from LS Bank (Pop Items/LS Store items)
app.post('/api/ls-bank/items/:shopItemId/sold', async (req, res) => {
    try {
        const { shopItemId } = req.params;
        const { amount, notes, recorded_by } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get item details before updating
            const itemResult = await client.query(
                'SELECT * FROM ls_shop_inventory WHERE shop_item_id = $1',
                [shopItemId]
            );

            if (itemResult.rows.length === 0) {
                throw new Error('Item not found');
            }

            const item = itemResult.rows[0];

            // Generate transaction ID for sale (20 chars total)
            // Format: S[YYYYMMDD]M[XX][XX][000001]
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;

            const prefix = `S${dateStr}M`;

            // Query for autonumber from ls_bank_transactions (check all transactions from today)
            const countResult = await client.query(
                `SELECT transaction_id FROM ls_bank_transactions
                 WHERE transaction_id LIKE '_' || $1 || '%'
                 ORDER BY transaction_id DESC
                 LIMIT 1`,
                [dateStr]
            );

            let autonumber = 1;
            if (countResult.rows.length > 0) {
                const lastId = countResult.rows[0].transaction_id;
                const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
                autonumber = lastNumber + 1;
            }

            // Format: S[8 digits]M[2 area][2 boss][6 autonumber] = 20 chars
            const transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;

            // Update item status to 'sold'
            await client.query(
                `UPDATE ls_shop_inventory
                 SET status = 'sold', quantity = 0
                 WHERE shop_item_id = $1`,
                [shopItemId]
            );

            // Create bank transaction for the sale
            await client.query(
                `INSERT INTO ls_bank_transactions
                 (transaction_type, item_id, item_name, amount, description, recorded_by,
                  event_id, source, status, transaction_id)
                 VALUES ('sale', $1, $2, $3, $4, $5, $6, 'Bank', 'completed', $7)`,
                [item.item_id, item.item_name, amount,
                 notes || `Sale of ${item.item_name} from LS Bank`,
                 recorded_by, item.event_id, transactionId]
            );

            await client.query('COMMIT');
            res.json({ success: true, message: 'Item sale recorded successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error recording item sale:', error);
        res.status(500).json({ error: error.message || 'Failed to record item sale' });
    }
});

// ============ LS SHOP ENDPOINTS ============

// Get all shop inventory
app.get('/api/ls-shop/inventory', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                i.*,
                u.character_name as added_by_name,
                e.name as event_name,
                ic.classification
            FROM ls_shop_inventory i
            LEFT JOIN users u ON i.added_by = u.id
            LEFT JOIN events e ON i.event_id = e.id
            LEFT JOIN item_classifications ic ON i.item_id = ic.item_id
            WHERE i.quantity > 0
            ORDER BY i.added_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching LS shop inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Add item to shop
app.post('/api/ls-shop/add', async (req, res) => {
    try {
        const { item_id, item_name, quantity, added_by, event_id, source, notes, transaction_id } = req.body;

        // Check if item already exists in shop
        const existing = await pool.query(
            'SELECT * FROM ls_shop_inventory WHERE item_id = $1 AND quantity > 0',
            [item_id]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update existing quantity
            result = await pool.query(`
                UPDATE ls_shop_inventory
                SET quantity = quantity + $1
                WHERE item_id = $2
                RETURNING *
            `, [quantity || 1, item_id]);
        } else {
            // Insert new item
            result = await pool.query(`
                INSERT INTO ls_shop_inventory
                (item_id, item_name, quantity, added_by, event_id, source, notes, transaction_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [item_id, item_name, quantity || 1, added_by, event_id, source || 'Manual', notes, transaction_id]);
        }

        res.json({ success: true, item: result.rows[0] });
    } catch (error) {
        console.error('Error adding item to shop:', error);
        res.status(500).json({ error: 'Failed to add item to shop' });
    }
});

// Retrieve item from shop
app.post('/api/ls-shop/retrieve', async (req, res) => {
    try {
        const {
            shop_item_id,
            item_id,
            item_name,
            quantity,
            retrieved_by,
            recipient_user_id,
            recipient_name,
            value_type,
            value_amount,
            notes
        } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Generate transaction ID if selling for gil (20 chars total)
            // Format: S[YYYYMMDD]M[XX][XX][000001]
            let transactionId = null;
            if (value_type === 'gil') {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const dateStr = `${year}${month}${day}`;
                const prefix = `S${dateStr}M`;

                // Query for autonumber from ls_bank_transactions (check all transactions from today)
                const countResult = await client.query(
                    `SELECT transaction_id FROM ls_bank_transactions
                     WHERE transaction_id LIKE '_' || $1 || '%'
                     ORDER BY transaction_id DESC
                     LIMIT 1`,
                    [dateStr]
                );

                let autonumber = 1;
                if (countResult.rows.length > 0) {
                    const lastId = countResult.rows[0].transaction_id;
                    const lastNumber = parseInt(lastId.substring(14)); // Last 6 digits
                    autonumber = lastNumber + 1;
                }

                transactionId = `${prefix}XXXX${String(autonumber).padStart(6, '0')}`;
            }

            // Decrease inventory quantity
            await client.query(`
                UPDATE ls_shop_inventory
                SET quantity = quantity - $1
                WHERE shop_item_id = $2
            `, [quantity, shop_item_id]);

            // Record retrieval transaction
            const transResult = await client.query(`
                INSERT INTO ls_shop_transactions
                (shop_item_id, item_id, item_name, quantity_retrieved, retrieved_by,
                 recipient_user_id, recipient_name, value_type, value_amount, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [shop_item_id, item_id, item_name, quantity, retrieved_by,
                recipient_user_id, recipient_name, value_type, value_amount, notes]);

            // If sold for gil, add to bank as sale
            if (value_type === 'gil') {
                await client.query(`
                    INSERT INTO ls_bank_transactions
                    (transaction_type, item_id, item_name, amount, description, recorded_by, source, transaction_id)
                    VALUES ('sale', $1, $2, $3, $4, $5, 'Bank', $6)
                `, [item_id, item_name, value_amount,
                    `Sold from LS Shop to ${recipient_name || 'LS Member'}`,
                    retrieved_by, transactionId]);
            }

            await client.query('COMMIT');
            res.json({ success: true, transaction: transResult.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error retrieving item from shop:', error);
        res.status(500).json({ error: 'Failed to retrieve item' });
    }
});

// Get shop transaction history
app.get('/api/ls-shop/transactions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                t.*,
                u1.character_name as retrieved_by_name,
                u2.character_name as recipient_user_name
            FROM ls_shop_transactions t
            LEFT JOIN users u1 ON t.retrieved_by = u1.id
            LEFT JOIN users u2 ON t.recipient_user_id = u2.id
            ORDER BY t.retrieved_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shop transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ============ MONTHLY JOB REGISTRATION ENDPOINTS ============

// Helper function to calculate consecutive months and multiplier
async function calculateJobMultiplier(client, userId, currentMonthYear, newJob) {
    // Get previous month's registration
    let previousMonth = currentMonthYear - 1;
    if (currentMonthYear % 100 === 1) {
        // If current month is January (01), previous month is December of last year
        const year = Math.floor(currentMonthYear / 100) - 1;
        previousMonth = year * 100 + 12;
    }

    const prevResult = await client.query(
        `SELECT job, consecutive_months FROM monthly_job_registrations
         WHERE user_id = $1 AND month_year = $2`,
        [userId, previousMonth]
    );

    let consecutiveMonths = 1;
    let multiplier = 1.00;

    if (prevResult.rows.length > 0 && prevResult.rows[0].job === newJob) {
        // Same job as previous month, increment consecutive counter
        consecutiveMonths = prevResult.rows[0].consecutive_months + 1;

        // Calculate multiplier based on consecutive months
        if (consecutiveMonths === 2) multiplier = 1.25;
        else if (consecutiveMonths === 3) multiplier = 1.50;
        else if (consecutiveMonths >= 4) multiplier = 1.75;
    }

    return { consecutiveMonths, multiplier };
}

// Get current month's job registration for current user
app.get('/api/monthly-jobs/current', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        const today = new Date();
        const currentMonthYear = today.getFullYear() * 100 + (today.getMonth() + 1);

        const result = await pool.query(
            `SELECT * FROM monthly_job_registrations
             WHERE user_id = $1 AND month_year = $2`,
            [userId, currentMonthYear]
        );

        if (result.rows.length === 0) {
            res.json({ registration: null, canChange: true });
        } else {
            res.json({
                registration: result.rows[0],
                canChange: !result.rows[0].locked
            });
        }
    } catch (error) {
        console.error('Error fetching current job:', error);
        res.status(500).json({ error: 'Failed to fetch current job' });
    }
});

// Get job history for current user
app.get('/api/monthly-jobs/history', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        const result = await pool.query(
            `SELECT
                mjr.*,
                u.character_name as updated_by_name
             FROM monthly_job_registrations mjr
             LEFT JOIN users u ON mjr.updated_by = u.id
             WHERE mjr.user_id = $1
             ORDER BY mjr.month_year DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching job history:', error);
        res.status(500).json({ error: 'Failed to fetch job history' });
    }
});

// Register or update job for current month
app.post('/api/monthly-jobs/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id, job } = req.body;

        if (!user_id || !job) {
            return res.status(400).json({ error: 'user_id and job are required' });
        }

        await client.query('BEGIN');

        // Get user's role from database (security - don't trust client)
        const userQuery = await client.query(
            `SELECT role FROM users WHERE id = $1`,
            [user_id]
        );

        if (userQuery.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const userRole = userQuery.rows[0].role;
        const isAdmin = userRole === 'admin' || userRole === 'raid_manager';

        const today = new Date();
        const currentMonthYear = today.getFullYear() * 100 + (today.getMonth() + 1);

        // Check if registration already exists
        const existing = await client.query(
            `SELECT * FROM monthly_job_registrations
             WHERE user_id = $1 AND month_year = $2`,
            [user_id, currentMonthYear]
        );

        if (existing.rows.length > 0) {
            // Registration exists - check if locked
            if (existing.rows[0].locked && !isAdmin) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    error: 'Nice Try'
                });
            }

            // Calculate new multiplier if job changed
            const { consecutiveMonths, multiplier } =
                await calculateJobMultiplier(client, user_id, currentMonthYear, job);

            // Update existing registration
            const result = await client.query(
                `UPDATE monthly_job_registrations
                 SET job = $1, consecutive_months = $2, multiplier = $3,
                     locked = true, updated_by = $4, updated_at = NOW()
                 WHERE user_id = $5 AND month_year = $6
                 RETURNING *`,
                [job, consecutiveMonths, multiplier, user_id, user_id, currentMonthYear]
            );

            await client.query('COMMIT');
            res.json({ success: true, registration: result.rows[0] });
        } else {
            // Create new registration
            const { consecutiveMonths, multiplier } =
                await calculateJobMultiplier(client, user_id, currentMonthYear, job);

            const result = await client.query(
                `INSERT INTO monthly_job_registrations
                 (user_id, month_year, job, consecutive_months, multiplier, locked, updated_by)
                 VALUES ($1, $2, $3, $4, $5, true, $6)
                 RETURNING *`,
                [user_id, currentMonthYear, job, consecutiveMonths, multiplier, user_id]
            );

            await client.query('COMMIT');
            res.json({ success: true, registration: result.rows[0] });
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error registering job:', error);
        res.status(500).json({ error: 'Failed to register job' });
    } finally {
        client.release();
    }
});

// Admin: Get all users' job registrations (grid data)
app.get('/api/monthly-jobs/all', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id as user_id,
                u.character_name,
                mjr.month_year,
                mjr.job,
                mjr.consecutive_months,
                mjr.multiplier,
                mjr.locked
            FROM users u
            LEFT JOIN monthly_job_registrations mjr ON u.id = mjr.user_id
            WHERE u.role IN ('member', 'raid_manager', 'admin')
            ORDER BY u.character_name, mjr.month_year DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all job registrations:', error);
        res.status(500).json({ error: 'Failed to fetch job registrations' });
    }
});

// Admin: Update any user's job registration
app.put('/api/monthly-jobs/admin-update', async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id, month_year, job, admin_id } = req.body;

        if (!user_id || !month_year || !job || !admin_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // Calculate new multiplier
        const { consecutiveMonths, multiplier } =
            await calculateJobMultiplier(client, user_id, month_year, job);

        // Check if registration exists
        const existing = await client.query(
            `SELECT id FROM monthly_job_registrations
             WHERE user_id = $1 AND month_year = $2`,
            [user_id, month_year]
        );

        let result;
        if (existing.rows.length > 0) {
            // Update existing
            result = await client.query(
                `UPDATE monthly_job_registrations
                 SET job = $1, consecutive_months = $2, multiplier = $3,
                     locked = true, updated_by = $4, updated_at = NOW()
                 WHERE user_id = $5 AND month_year = $6
                 RETURNING *`,
                [job, consecutiveMonths, multiplier, admin_id, user_id, month_year]
            );
        } else {
            // Create new
            result = await client.query(
                `INSERT INTO monthly_job_registrations
                 (user_id, month_year, job, consecutive_months, multiplier, locked, updated_by)
                 VALUES ($1, $2, $3, $4, $5, true, $6)
                 RETURNING *`,
                [user_id, month_year, job, consecutiveMonths, multiplier, admin_id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, registration: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating job registration:', error);
        res.status(500).json({ error: 'Failed to update job registration' });
    } finally {
        client.release();
    }
});

// Get current multiplier for a user (used in point calculations)
app.get('/api/monthly-jobs/multiplier/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const today = new Date();
        const currentMonthYear = today.getFullYear() * 100 + (today.getMonth() + 1);

        const result = await pool.query(
            `SELECT multiplier, consecutive_months, job
             FROM monthly_job_registrations
             WHERE user_id = $1 AND month_year = $2`,
            [userId, currentMonthYear]
        );

        if (result.rows.length === 0) {
            res.json({ multiplier: 1.00, consecutive_months: 0, job: null });
        } else {
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error('Error fetching multiplier:', error);
        res.status(500).json({ error: 'Failed to fetch multiplier' });
    }
});

// ============ POINTS SYSTEM CONFIRMATION ENDPOINTS ============

// Get user's points system confirmation status
app.get('/api/points-confirmation', async (req, res) => {
    try {
        const userId = req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        const result = await pool.query(
            `SELECT confirmed_at FROM points_system_confirmation
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            res.json({ confirmed: false });
        } else {
            res.json({
                confirmed: true,
                confirmed_at: result.rows[0].confirmed_at
            });
        }
    } catch (error) {
        console.error('Error checking points confirmation:', error);
        res.status(500).json({ error: 'Failed to check confirmation status' });
    }
});

// Record user's points system confirmation
app.post('/api/points-confirmation', async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Check if already confirmed
        const existing = await pool.query(
            `SELECT id, confirmed_at FROM points_system_confirmation
             WHERE user_id = $1`,
            [user_id]
        );

        if (existing.rows.length > 0) {
            // Already confirmed, return existing confirmation
            return res.json({
                success: true,
                confirmed_at: existing.rows[0].confirmed_at
            });
        }

        // Insert new confirmation
        const result = await pool.query(
            `INSERT INTO points_system_confirmation (user_id, confirmed_at)
             VALUES ($1, NOW())
             RETURNING confirmed_at`,
            [user_id]
        );

        res.json({
            success: true,
            confirmed_at: result.rows[0].confirmed_at
        });

    } catch (error) {
        console.error('Error recording points confirmation:', error);
        res.status(500).json({ error: 'Failed to record confirmation' });
    }
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// ============ MIGRATION RUNNER ============
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    try {
        // Create migrations table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of already executed migrations
        const executed = await pool.query('SELECT filename FROM migrations');
        const executedFiles = new Set(executed.rows.map(row => row.filename));

        // Get all migration files
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Run pending migrations
        for (const file of files) {
            if (!executedFiles.has(file)) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                try {
                    await pool.query(sql);
                    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
                    console.log(`✓ Migration ${file} completed`);
                } catch (error) {
                    console.error(`✗ Migration ${file} failed:`, error.message);
                    // Continue with other migrations instead of stopping
                }
            }
        }

        console.log('All migrations processed');
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Run migrations on startup
    await runMigrations();
});
