#!/bin/bash

# FFXI Linkshell Manager - Complete Workflow Test Suite
# Tests backend API + frontend rendering for Discord integration
# Last Updated: 2025-10-18

set -e  # Exit on error

echo "========================================="
echo "FFXI Complete Workflow Test Suite"
echo "========================================="
echo ""
echo "Testing Discord Integration:"
echo "  Discord → n8n → Backend API → Frontend"
echo ""

# Configuration
BACKEND_URL="https://ffxi-linkshell-manager-production.up.railway.app"
FRONTEND_URL="https://ffxi-linkshell-manager-frontend.vercel.app"
TEMP_DIR="/tmp/ffxi-test-$$"
mkdir -p "$TEMP_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNING=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((TESTS_WARNING++))
}

# =========================================
# PART 1: BACKEND API TESTS
# =========================================

echo "========================================="
echo "PART 1: Backend API Tests"
echo "========================================="
echo ""

# Test 1: Get upcoming events
echo "Test 1: GET /api/events/upcoming"
echo "-----------------------------------------"
UPCOMING=$(curl -s "$BACKEND_URL/api/events/upcoming")

if [ -z "$UPCOMING" ]; then
    fail "No response from upcoming events endpoint"
    exit 1
fi

# Save for later use
echo "$UPCOMING" > "$TEMP_DIR/upcoming.json"

EVENT_COUNT=$(echo "$UPCOMING" | python -m json.tool 2>/dev/null | grep -c '"id"' || echo "0")
if [ "$EVENT_COUNT" -gt 0 ]; then
    pass "Found $EVENT_COUNT upcoming event(s)"
    EVENT_ID=$(echo "$UPCOMING" | python -m json.tool | grep '"id"' | head -1 | grep -o '[0-9]*')
    EVENT_NAME=$(echo "$UPCOMING" | python -m json.tool | grep '"event_name"' | head -1 | cut -d'"' -f4)
    REGISTERED_COUNT=$(echo "$UPCOMING" | python -m json.tool | grep '"registered_count"' | head -1 | grep -o '"[0-9]*"' | tr -d '"')

    echo "  Event ID: $EVENT_ID"
    echo "  Event Name: $EVENT_NAME"
    echo "  Registered Count: $REGISTERED_COUNT"

    if [ "$REGISTERED_COUNT" -gt 0 ]; then
        pass "Event has $REGISTERED_COUNT participant(s)"
    else
        warn "Event has 0 participants (expected if no Discord signups)"
    fi
else
    warn "No upcoming events found"
    EVENT_ID=""
fi
echo ""

# Test 2: Get specific event details
if [ -n "$EVENT_ID" ]; then
    echo "Test 2: GET /api/events/$EVENT_ID"
    echo "-----------------------------------------"
    EVENT_DETAILS=$(curl -s "$BACKEND_URL/api/events/$EVENT_ID")
    echo "$EVENT_DETAILS" > "$TEMP_DIR/event.json"

    if echo "$EVENT_DETAILS" | grep -q '"id"'; then
        pass "Event details retrieved"

        IS_FROM_DISCORD=$(echo "$EVENT_DETAILS" | python -m json.tool | grep '"is_from_discord"' | grep -o 'true\|false')
        if [ "$IS_FROM_DISCORD" = "true" ]; then
            pass "Event is from Discord integration"
            RAID_HELPER_ID=$(echo "$EVENT_DETAILS" | python -m json.tool | grep '"raid_helper_id"' | cut -d'"' -f4)
            echo "  Raid Helper ID: $RAID_HELPER_ID"
        else
            warn "Event is NOT from Discord (manual creation)"
        fi
    else
        fail "Failed to get event details"
    fi
    echo ""
fi

# Test 3: Get event participants
if [ -n "$EVENT_ID" ]; then
    echo "Test 3: GET /api/events/$EVENT_ID/participants"
    echo "-----------------------------------------"
    PARTICIPANTS=$(curl -s "$BACKEND_URL/api/events/$EVENT_ID/participants")
    echo "$PARTICIPANTS" > "$TEMP_DIR/participants.json"

    PARTICIPANT_COUNT=$(echo "$PARTICIPANTS" | python -m json.tool 2>/dev/null | grep -c '"discord_id"' || echo "0")

    if [ "$PARTICIPANT_COUNT" -gt 0 ]; then
        pass "Found $PARTICIPANT_COUNT participant(s)"

        # Check for Discord integration
        HAS_DISCORD=$(echo "$PARTICIPANTS" | python -m json.tool | grep -c '"source": "discord"' || echo "0")
        if [ "$HAS_DISCORD" -gt 0 ]; then
            pass "Discord signups are present ($HAS_DISCORD)"

            # Show first participant
            FIRST_NAME=$(echo "$PARTICIPANTS" | python -m json.tool | grep '"name"' | head -1 | cut -d'"' -f4)
            FIRST_SOURCE=$(echo "$PARTICIPANTS" | python -m json.tool | grep '"source"' | head -1 | cut -d'"' -f4)
            FIRST_STATUS=$(echo "$PARTICIPANTS" | python -m json.tool | grep '"status"' | head -1 | cut -d'"' -f4)

            echo "  Example participant: $FIRST_NAME (source: $FIRST_SOURCE, status: $FIRST_STATUS)"
        else
            warn "No Discord signups (all participants from website)"
        fi
    else
        warn "No participants found for event $EVENT_ID"
    fi
    echo ""
fi

# =========================================
# PART 2: FRONTEND TESTS
# =========================================

echo "========================================="
echo "PART 2: Frontend Tests"
echo "========================================="
echo ""

# Test 4: Frontend homepage loads
echo "Test 4: Frontend Homepage"
echo "-----------------------------------------"
FRONTEND_HTML=$(curl -s "$FRONTEND_URL")

if [ -n "$FRONTEND_HTML" ]; then
    pass "Frontend loaded successfully"

    # Check if it's a proper HTML page
    if echo "$FRONTEND_HTML" | grep -q "<html"; then
        pass "Valid HTML page"
    else
        fail "Response is not valid HTML"
    fi
else
    fail "Frontend did not respond"
fi
echo ""

# Test 5: Frontend events page
echo "Test 5: Frontend Events Page"
echo "-----------------------------------------"
EVENTS_PAGE=$(curl -s "$FRONTEND_URL/events.html" 2>/dev/null || curl -s "$FRONTEND_URL/events" 2>/dev/null || echo "")

if [ -n "$EVENTS_PAGE" ]; then
    pass "Events page accessible"
    echo "$EVENTS_PAGE" > "$TEMP_DIR/events_page.html"

    # Check for event-related content
    if echo "$EVENTS_PAGE" | grep -qi "event"; then
        pass "Page contains event-related content"
    else
        warn "Events page may not be loading properly"
    fi
else
    warn "Events page not accessible (may use client-side routing)"
fi
echo ""

# Test 6: Frontend can reach backend API
echo "Test 6: Frontend API Integration"
echo "-----------------------------------------"

# Check if frontend HTML references the backend API
if echo "$FRONTEND_HTML" | grep -q "$BACKEND_URL"; then
    pass "Frontend references backend API"
elif echo "$FRONTEND_HTML" | grep -qi "ffxi-linkshell-manager-production.up.railway.app"; then
    pass "Frontend references backend API"
else
    warn "Could not verify frontend-backend connection in HTML (may be in JS bundle)"
fi
echo ""

# Test 7: Check if event data is being fetched
echo "Test 7: Frontend JavaScript API Calls"
echo "-----------------------------------------"

# Extract JavaScript files
JS_FILES=$(echo "$FRONTEND_HTML" | grep -o 'src="[^"]*\.js"' | cut -d'"' -f2 | head -3)

if [ -n "$JS_FILES" ]; then
    JS_COUNT=$(echo "$JS_FILES" | wc -l)
    pass "Found $JS_COUNT JavaScript file(s)"

    # Check if any JS file mentions API endpoints
    API_FOUND=0
    for js_file in $JS_FILES; do
        # Handle relative URLs
        if [[ "$js_file" == http* ]]; then
            JS_URL="$js_file"
        else
            JS_URL="$FRONTEND_URL/$js_file"
        fi

        JS_CONTENT=$(curl -s "$JS_URL" 2>/dev/null || echo "")
        if echo "$JS_CONTENT" | grep -q "/api/events"; then
            API_FOUND=1
            pass "JavaScript contains API calls to /api/events"
            break
        fi
    done

    if [ "$API_FOUND" -eq 0 ]; then
        warn "Could not verify API calls in JavaScript (may be minified/bundled)"
    fi
else
    warn "No JavaScript files found in HTML"
fi
echo ""

# =========================================
# PART 3: INTEGRATION VERIFICATION
# =========================================

echo "========================================="
echo "PART 3: Integration Verification"
echo "========================================="
echo ""

echo "Test 8: End-to-End Data Flow"
echo "-----------------------------------------"

if [ -n "$EVENT_ID" ] && [ "$PARTICIPANT_COUNT" -gt 0 ]; then
    pass "Backend has event with participants"

    # Verify registered count matches participants
    if [ "$REGISTERED_COUNT" = "$PARTICIPANT_COUNT" ]; then
        pass "Registered count ($REGISTERED_COUNT) matches participants ($PARTICIPANT_COUNT)"
    else
        warn "Registered count ($REGISTERED_COUNT) != participants ($PARTICIPANT_COUNT)"
    fi

    # Check if Discord integration is working
    if [ "$IS_FROM_DISCORD" = "true" ] && [ "$HAS_DISCORD" -gt 0 ]; then
        pass "Discord integration fully operational"
        echo ""
        echo "  ✓ Event synced from Discord"
        echo "  ✓ Participants synced from Raid-Helper"
        echo "  ✓ Backend API returning unified data"
    fi
else
    warn "No events with participants to verify integration"
fi
echo ""

# =========================================
# SUMMARY
# =========================================

echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}All critical tests passed!${NC}"
else
    echo -e "${RED}$TESTS_FAILED test(s) failed${NC}"
fi

echo ""
echo "Results:"
echo "  ✓ Passed:  $TESTS_PASSED"
echo "  ✗ Failed:  $TESTS_FAILED"
echo "  ⚠ Warning: $TESTS_WARNING"
echo ""

if [ -n "$EVENT_ID" ]; then
    echo "Test Event Details:"
    echo "  Event ID: $EVENT_ID"
    echo "  Event Name: $EVENT_NAME"
    echo "  Participants: $PARTICIPANT_COUNT"
    echo "  From Discord: $IS_FROM_DISCORD"
    echo ""
fi

echo "Test data saved to: $TEMP_DIR"
echo ""
echo "MANUAL VERIFICATION REQUIRED:"
echo "========================================="
echo "1. Open browser: $FRONTEND_URL"
echo "2. Navigate to Events page"
echo "3. Verify event \"$EVENT_NAME\" appears with $REGISTERED_COUNT participant(s)"
echo "4. Click on event to view details"
echo "5. Verify participant list shows Discord users with proper status"
echo ""

# Cleanup option
read -p "Delete test files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$TEMP_DIR"
    echo "Test files deleted."
fi

# Exit code
if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
else
    exit 0
fi
