// n8n Code Node: Parse Raid-Helper API Response
// Place this AFTER the HTTP Request to Raid-Helper API
// Maps Raid-Helper signup data to backend webhook format

// INPUT: Response from https://raid-helper.dev/api/v2/events/{eventId}
// OUTPUT: Properly formatted payload for backend webhook

const raidHelperResponse = $input.item.json;
const discordEventData = $node["Parse Discord Events"].json; // Get original Discord data

// ==================================================
// PARSE RAID-HELPER API RESPONSE
// ==================================================

// Extract event details
const event = raidHelperResponse.event || raidHelperResponse;

const eventId = event.id || event.eventId;
const title = event.title || event.name || discordEventData.event_name;
const description = event.description || discordEventData.description;
const startTime = event.startTime || event.start_time || discordEventData.event_time_readable;

// Parse signups with proper status mapping
const signups = [];

if (event.signUps || event.signups || event.participants) {
  const participants = event.signUps || event.signups || event.participants;

  for (const participant of participants) {
    // Map Raid-Helper status to our status format
    // Raid-Helper statuses: "signed", "tentative", "late", "absent", "declined"
    // Our statuses: "accepted", "tentative", "declined"

    let status = 'accepted'; // default

    if (participant.status) {
      const rhStatus = participant.status.toLowerCase();

      if (rhStatus === 'signed' || rhStatus === 'accepted' || rhStatus === 'confirmed') {
        status = 'accepted';
      } else if (rhStatus === 'tentative' || rhStatus === 'late' || rhStatus === 'maybe') {
        status = 'tentative';
      } else if (rhStatus === 'declined' || rhStatus === 'absent') {
        status = 'declined';
      }
    }

    // Extract user info
    const userId = participant.userId || participant.user_id || participant.discord_id;
    const username = participant.userName || participant.username || participant.name;
    const userRole = participant.role || participant.class || 'Member';

    // Only include if we have required fields
    if (userId && username) {
      signups.push({
        discord_id: userId,
        username: username,
        role: userRole,
        status: status
      });
    }
  }
}

// ==================================================
// BUILD WEBHOOK PAYLOAD
// ==================================================

const webhookPayload = {
  event_id: eventId || discordEventData.raid_helper_id,
  action: 'created', // or 'updated' depending on your logic
  event: {
    title: title,
    description: description,
    start_time: startTime,
    channel_id: discordEventData.channel_id,
    message_id: discordEventData.message_id,
    signups: signups
  }
};

// ==================================================
// LOGGING
// ==================================================

console.log(`Parsed Raid-Helper event: ${title}`);
console.log(`Total signups: ${signups.length}`);

if (signups.length > 0) {
  const statusCounts = {
    accepted: signups.filter(s => s.status === 'accepted').length,
    tentative: signups.filter(s => s.status === 'tentative').length,
    declined: signups.filter(s => s.status === 'declined').length
  };

  console.log(`- Accepted: ${statusCounts.accepted}`);
  console.log(`- Tentative: ${statusCounts.tentative}`);
  console.log(`- Declined: ${statusCounts.declined}`);
}

// Return formatted payload for webhook
return { json: webhookPayload };
