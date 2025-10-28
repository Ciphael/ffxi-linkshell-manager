// n8n Code Node: Extract Raid-Helper Event ID
// Prepares event data for Raid-Helper API call
// Place this BEFORE the HTTP Request node

// INPUT: Parsed Discord event from previous node
// OUTPUT: Event data with raid_helper_id extracted

const event = $input.item.json;

// ==================================================
// EXTRACT RAID-HELPER EVENT ID
// ==================================================

let raidHelperId = null;

// Method 1: Check if URL contains event ID
// Raid-Helper URLs typically look like: https://raid-helper.dev/events/123456789
if (event.url) {
  const urlMatch = event.url.match(/raid-helper\.dev\/events\/(\d+)/);
  if (urlMatch) {
    raidHelperId = urlMatch[1];
  }
}

// Method 2: Check embed description for event ID
// Sometimes embedded in description as link
if (!raidHelperId && event.description) {
  const descMatch = event.description.match(/raid-helper\.dev\/events\/(\d+)/);
  if (descMatch) {
    raidHelperId = descMatch[1];
  }
}

// Method 3: Check footer for event ID
if (!raidHelperId && event.footer_text) {
  const footerMatch = event.footer_text.match(/ID:?\s*(\d+)/i);
  if (footerMatch) {
    raidHelperId = footerMatch[1];
  }
}

// Method 4: Check fields for event ID
if (!raidHelperId && event.fields) {
  for (const field of event.fields) {
    if (field.name && field.name.toLowerCase().includes('event id')) {
      const fieldMatch = field.value.match(/(\d+)/);
      if (fieldMatch) {
        raidHelperId = fieldMatch[1];
        break;
      }
    }
  }
}

// ==================================================
// BUILD OUTPUT FOR API CALL
// ==================================================

if (!raidHelperId) {
  console.warn(`No Raid-Helper ID found for event: ${event.event_name}`);
  console.warn(`Message ID: ${event.message_id}`);
  console.warn(`URL: ${event.url}`);

  // Skip this event - return null to filter it out
  return null;
}

// Return event data with raid_helper_id
return {
  json: {
    ...event,
    raid_helper_id: raidHelperId,
    raid_helper_api_url: `https://raid-helper.dev/api/v2/events/${raidHelperId}`
  }
};
