// Parse Raid-Helper API response
// WITH ZONE DETECTION - Extracts zone from Discord emoji codes in description
// Handles className being either job class or status

const items = $input.all();

if (!items || items.length === 0) {
  return [];
}

const results = [];

// ============================================
// ZONE EXTRACTION FUNCTION
// ============================================
function extractZoneFromDescription(description) {
  if (!description) {
    return 'Other';
  }

  // Extract letters from Discord custom emoji codes
  // Pattern: <:LETTER:number> where LETTER is the actual letter
  const emojiPattern = /<:([A-Z]):\d+>/g;
  const matches = description.matchAll(emojiPattern);

  let extractedLetters = '';
  for (const match of matches) {
    extractedLetters += match[1]; // Add the letter (group 1)
  }

  console.log(`Raw description: ${description.substring(0, 200)}`);
  console.log(`Extracted letters from emojis: "${extractedLetters}"`);

  // Clean up extracted text - remove spaces and convert to uppercase
  const cleanText = extractedLetters.toUpperCase().replace(/\s+/g, '');

  // Check for exact matches first (single zones)
  const validSingleZones = ['SKY', 'LIMBUS', 'SEA', 'HENM', 'DYNAMIS'];

  if (validSingleZones.includes(cleanText)) {
    console.log(`✓ Single zone match: ${cleanText}`);
    return cleanText;
  }

  // Check for combination zones (multiple valid zones mentioned)
  const foundZones = validSingleZones.filter(zone => cleanText.includes(zone));

  if (foundZones.length === 1) {
    console.log(`✓ Single zone found in text: ${foundZones[0]}`);
    return foundZones[0];
  } else if (foundZones.length > 1) {
    // Multiple zones = "Other"
    console.log(`✓ Multiple zones detected: ${foundZones.join(', ')} -> Other`);
    return 'Other';
  }

  // No recognized zone
  console.log(`✗ No recognized zone, defaulting to Other`);
  return 'Other';
}

// ============================================
// MAIN PARSING LOOP
// ============================================
for (const item of items) {
  const apiData = item.json;

  // Extract event data from API response
  const messageId = apiData.id;
  const channelId = apiData.channelId;
  const title = apiData.title || apiData.displayTitle || "Raid Event";
  const description = apiData.description || "";

  // *** EXTRACT ZONE FROM DESCRIPTION ***
  const eventType = extractZoneFromDescription(description);

  // Parse dates from API
  const startTime = new Date(apiData.startTime * 1000).toISOString(); // Unix timestamp to ISO
  const endTime = apiData.endTime
    ? new Date(apiData.endTime * 1000).toISOString()
    : new Date(apiData.startTime * 1000 + 3 * 60 * 60 * 1000).toISOString();

  // Parse signups from API
  const signups = [];

  if (apiData.signUps && apiData.signUps.length > 0) {
    for (const signup of apiData.signUps) {
      // Determine status from className
      // className can be either:
      // 1. A job/class name (blm, whm, rdm, etc.) = accepted
      // 2. A status ("Tentative", "Maybe", "Declined") = that status

      let status = 'accepted'; // Default

      const className = signup.className || '';
      const classNameLower = className.toLowerCase();

      // Check if className is actually a status keyword (case-insensitive)
      if (classNameLower === 'tentative' || classNameLower === 'maybe' || classNameLower === 'late') {
        status = 'tentative';
      } else if (classNameLower === 'declined' || classNameLower === 'absent' || classNameLower === 'absence' || classNameLower === 'no') {
        status = 'declined';
      } else {
        // className is a job/class (blm, whm, rdm, war, etc.) = accepted
        status = 'accepted';
      }

      // Strip parentheses and their contents from username
      // "Roseme(THF)" becomes "Roseme"
      const cleanUsername = signup.name.replace(/\s*\([^)]*\)/g, '').trim();

      signups.push({
        discord_id: signup.userId,
        username: cleanUsername,
        role: 'Member',
        status: status
      });

      // Debug logging
      console.log(`${cleanUsername}: className="${className}" -> status="${status}"`);
    }
  }

  // Get leader info
  const leaderName = apiData.leaderName || "Raid-Helper";
  const leaderId = apiData.leaderId || "unknown";

  // Summary logging
  const statusCounts = {
    accepted: signups.filter(s => s.status === 'accepted').length,
    tentative: signups.filter(s => s.status === 'tentative').length,
    declined: signups.filter(s => s.status === 'declined').length
  };

  console.log(`=================================`);
  console.log(`Event: ${title}`);
  console.log(`Zone/Type: ${eventType}`);
  console.log(`Total signups: ${signups.length}`);
  console.log(`  Accepted: ${statusCounts.accepted}`);
  console.log(`  Tentative: ${statusCounts.tentative}`);
  console.log(`  Declined: ${statusCounts.declined}`);
  console.log(`=================================`);

  results.push({
    json: {
      event_id: messageId,
      action: "created",
      event: {
        title: title,
        description: description,
        event_type: eventType, // *** ZONE ADDED HERE ***
        start_time: startTime,
        end_time: endTime,
        channel_id: channelId,
        message_id: messageId,
        leader: {
          discord_id: leaderId,
          username: leaderName
        },
        signups: signups
      }
    }
  });
}

return results;
