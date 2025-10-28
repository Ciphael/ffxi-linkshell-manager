// Parse Raid-Helper API response
// FIXED VERSION - Handles className being either job class or status

const items = $input.all();

if (!items || items.length === 0) {
  return [];
}

const results = [];

for (const item of items) {
  const apiData = item.json;

  // Extract event data from API response
  const messageId = apiData.id;
  const channelId = apiData.channelId;
  const title = apiData.title || apiData.displayTitle || "Raid Event";
  const description = apiData.description || "";

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
      } else if (classNameLower === 'declined' || classNameLower === 'absent' || classNameLower === 'no') {
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

  console.log(`Event: ${title}`);
  console.log(`Total signups: ${signups.length}`);
  console.log(`  Accepted: ${statusCounts.accepted}`);
  console.log(`  Tentative: ${statusCounts.tentative}`);
  console.log(`  Declined: ${statusCounts.declined}`);

  results.push({
    json: {
      event_id: messageId,
      action: "created",
      event: {
        title: title,
        description: description,
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
