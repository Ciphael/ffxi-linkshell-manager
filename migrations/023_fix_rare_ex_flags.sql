-- Migration 023: Fix is_rare and is_ex flags
-- The conversion script had incorrect flag constants:
--   OLD: RARE=0x0004 (bit 2), EX=0x0040 (bit 6)
--   NEW: RARE=0x8000 (bit 15), EX=0x4000 (bit 14)
-- This migration recalculates is_rare and is_ex from the flags column

BEGIN;

-- Update is_rare based on bit 15 (0x8000 = 32768)
UPDATE item_basic
SET is_rare = ((flags & 32768) != 0);

-- Update is_ex based on bit 14 (0x4000 = 16384)
UPDATE item_basic
SET is_ex = ((flags & 16384) != 0);

-- Verify the fix with some known items
DO $$
DECLARE
    malboro_rare BOOLEAN;
    byakko_rare BOOLEAN;
    byakko_ex BOOLEAN;
BEGIN
    -- Malboro Fiber (itemid 837, flags=4) should NOT be rare/ex
    SELECT is_rare INTO malboro_rare FROM item_basic WHERE itemid = 837;
    IF malboro_rare = TRUE THEN
        RAISE EXCEPTION 'Verification failed: Malboro Fiber should not be rare';
    END IF;

    -- Byakko's Haidate (itemid 12818, flags=63572) should be rare AND ex
    SELECT is_rare, is_ex INTO byakko_rare, byakko_ex FROM item_basic WHERE itemid = 12818;
    IF byakko_rare = FALSE OR byakko_ex = FALSE THEN
        RAISE EXCEPTION 'Verification failed: Byakko''s Haidate should be rare and ex';
    END IF;

    RAISE NOTICE 'Migration 023 verification passed!';
    RAISE NOTICE '  - Malboro Fiber: is_rare=false (correct)';
    RAISE NOTICE '  - Byakko''s Haidate: is_rare=true, is_ex=true (correct)';
END $$;

COMMIT;
