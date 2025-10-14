#!/usr/bin/env python3
import re

with open('server.js', 'r') as f:
    content = f.read()

# Fix 1: /api/market-rates endpoint (around line 387)
content = re.sub(
    r"(ic\.converts_to_item_name,\s+COALESCE\(m\.mob_name, 'Unknown Boss'\) as mob_name)\s+(FROM mob_droplist md)",
    r"\1,\n                ib.is_rare,\n                ib.is_ex\n            \2",
    content,
    count=1
)

# Fix 2: /api/bosses/:bossId/planned-drops endpoint (around line 473)
content = re.sub(
    r"(ic\.convertible,\s+ic\.converts_to_item_name)\s+(FROM planned_event_drops ped)",
    r"\1,\n                ib.is_rare,\n                ib.is_ex\n            \2",
    content,
    count=1
)

# Fix 2b: Add item_basic JOIN to planned-drops endpoint
content = re.sub(
    r"(LEFT JOIN item_classifications ic ON ped\.item_id = ic\.item_id)\s+(WHERE ped\.event_boss_id)",
    r"\1\n            LEFT JOIN item_basic ib ON ped.item_id = ib.itemid\n            \2",
    content,
    count=1
)

# Fix 3: /api/mob-droplist/:mobDropId/all-drops endpoint (around line 561)
content = re.sub(
    r"(ic\.convertible,\s+ic\.converts_to_item_name)\s+(FROM mob_droplist md\s+LEFT JOIN item_equipment)",
    r"\1,\n                ib.is_rare,\n                ib.is_ex\n            \2",
    content,
    count=1
)

with open('server.js', 'w') as f:
    f.write(content)

print("Fixed all three endpoints!")
