#!/bin/bash

INPUT="/c/users/roger/desktop/AirSkyBoat/sql/item_usable.sql"
OUTPUT="/c/users/roger/desktop/ffxi-linkshell-manager/migrations/021_import_item_usable.sql"

echo "-- Migration 021: Import item_usable table from AirSkyBoat" > "$OUTPUT"
echo "-- This table contains usable item data including enchantment items" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Create table with PostgreSQL syntax
cat >> "$OUTPUT" << 'EOF'
CREATE TABLE IF NOT EXISTS item_usable (
    itemid SMALLINT NOT NULL,
    name TEXT NOT NULL,
    "validTargets" SMALLINT NOT NULL DEFAULT 0,
    activation SMALLINT NOT NULL DEFAULT 0,
    animation SMALLINT NOT NULL DEFAULT 0,
    "animationTime" SMALLINT NOT NULL DEFAULT 0,
    "maxCharges" SMALLINT NOT NULL DEFAULT 0,
    "useDelay" SMALLINT NOT NULL DEFAULT 0,
    "reuseDelay" INTEGER NOT NULL DEFAULT 0,
    aoe SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (itemid)
);

-- Insert data
EOF

# Extract INSERT statements and convert to PostgreSQL format
grep "INSERT INTO.*item_usable" "$INPUT" | \
    sed "s/INSERT INTO \`item_usable\`/INSERT INTO item_usable/g" | \
    sed "s/VALUES (/VALUES (/g" \
    >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "-- Create index on activation for enchantment queries" >> "$OUTPUT"
echo "CREATE INDEX IF NOT EXISTS idx_item_usable_activation ON item_usable(activation);" >> "$OUTPUT"

echo "Conversion complete: $OUTPUT"
