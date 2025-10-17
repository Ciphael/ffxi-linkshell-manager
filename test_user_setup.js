/**
 * Test User Setup Script
 *
 * Purpose: Create or update test users for automated testing with role-based access
 *
 * Usage:
 *   node test_user_setup.js
 *
 * This script creates TWO test users:
 * 1. SanityTest_Admin - Admin role (full access to admin functions)
 * 2. SanityTest_User - Standard user role (limited access)
 *
 * Admin-only functions:
 * - Create Events (Events tab)
 * - Configure Items (Events tab)
 * - Manage Points Records (Events -> Points Management)
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test users configuration
const TEST_USERS = [
    {
        username: 'SanityTest_Admin',
        role: 'admin',
        description: 'Admin user with full access'
    },
    {
        username: 'SanityTest_User',
        role: 'user',
        description: 'Standard user with limited access'
    }
];

async function setupTestUser(username, role, description) {
    try {
        // Check if user exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE character_name = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            console.log(`  User "${username}" already exists`);

            // Update role if different
            if (existingUser.rows[0].role !== role) {
                await pool.query(
                    'UPDATE users SET role = $1 WHERE character_name = $2',
                    [role, username]
                );
                console.log(`  ✓ Updated "${username}" to role: ${role}`);
            } else {
                console.log(`  ✓ Role already correct: ${role}`);
            }

            // Display user info
            const updatedUser = await pool.query(
                'SELECT id, character_name, role, created_at FROM users WHERE character_name = $1',
                [username]
            );
            console.log(`  User ID: ${updatedUser.rows[0].id || updatedUser.rows[0].user_id}`);
            console.log(`  Role: ${updatedUser.rows[0].role}`);
        } else {
            console.log(`  User "${username}" does not exist - creating...`);

            // Create new user
            const result = await pool.query(
                'INSERT INTO users (character_name, role, created_at) VALUES ($1, $2, NOW()) RETURNING *',
                [username, role]
            );
            console.log(`  ✓ Created new user "${username}" with role: ${role}`);
            console.log(`  User ID: ${result.rows[0].id || result.rows[0].user_id}`);
        }
    } catch (error) {
        console.error(`  ✗ ERROR setting up user "${username}":`, error.message);
        throw error;
    }
}

async function setupAllTestUsers() {
    try {
        console.log('========================================');
        console.log('  Test User Setup');
        console.log('========================================\n');
        console.log('Connecting to database...\n');

        // Check if users table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'users'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.error('ERROR: users table does not exist in database');
            console.log('Please ensure database migrations have been run first.');
            process.exit(1);
        }

        // Setup each test user
        for (const { username, role, description } of TEST_USERS) {
            console.log(`Setting up: ${username}`);
            console.log(`  Description: ${description}`);
            await setupTestUser(username, role, description);
            console.log('');
        }

        console.log('========================================');
        console.log('  ✓ All test users setup complete');
        console.log('========================================\n');

        console.log('Test users created:');
        console.log('  1. SanityTest_Admin (role: admin)');
        console.log('     - Can create events');
        console.log('     - Can configure items');
        console.log('     - Can manage points records');
        console.log('');
        console.log('  2. SanityTest_User (role: user)');
        console.log('     - Standard member access');
        console.log('     - Cannot access admin functions');
        console.log('');
        console.log('You can now run role-based tests!');

    } catch (error) {
        console.error('\n✗ ERROR setting up test users:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\nDatabase connection closed');
    }
}

// Run setup
setupAllTestUsers();
