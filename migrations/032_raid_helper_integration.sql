-- Migration: Add Raid-Helper Integration Support
-- Purpose: Enable Discord event sync with Raid-Helper
-- Date: 2025-10-17

-- Add raid_helper_id to events table for linking Discord events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS raid_helper_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS discord_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_from_discord BOOLEAN DEFAULT FALSE;

-- Add discord_id to linkshell_members for mapping Discord users
ALTER TABLE linkshell_members
ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS discord_username VARCHAR(255);

-- Create table for tracking event signups from Discord
CREATE TABLE IF NOT EXISTS event_signups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES linkshell_members(id) ON DELETE CASCADE,
    discord_id VARCHAR(255),
    discord_username VARCHAR(255),
    role VARCHAR(100),  -- Tank, DD, Healer, Support, etc.
    status VARCHAR(50) DEFAULT 'accepted',  -- accepted, tentative, declined
    signed_up_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, discord_id)
