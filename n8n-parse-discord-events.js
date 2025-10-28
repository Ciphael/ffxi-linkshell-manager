// n8n Code Node: Parse Discord Raid-Helper Events
// Handles actual Discord message payload structure
// Initially processes ALL events, can be switched to upcoming-only

// INPUT: Discord messages from Raid-Helper bot
// OUTPUT: Array of parsed event objects ready for API calls

const events = [];
const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp

// Iterate over all incoming Discord messages
for (const message of $input.all()) {
  const item = message.json;

  // Verify this is a Raid-Helper message
  if (!item.author || item.author.username !== 'Raid-Helper' || !item.author.bot) {
    continue; // Skip non-Raid-Helper messages
  }

  // Check if message has embeds (where event data lives)
  if (!item.embeds || item.embeds.length === 0) {
    continue; // Skip messages without embeds
  }

  // IMPORTANT: Only process FULL event messages (ones with components/signup buttons)
  // Simple notification messages don't have components
  if (!item.components || item.components.length === 0) {
    continue; // Skip notification messages - we only want full events
  }

  // Parse each embed (typically one event per message)
  for (const embed of item.embeds) {
    // Extract event details from embed
    const title = embed.title || 'Unknown Event';
    const description = embed.description || '';

    // ==================================================
    // EXTRACT RAID-HELPER EVENT ID
    // ==================================================
    // The event ID is the last segment of the embed URL
    // Format: https://discord.com/channels/{guild_id}/{channel_id}/{event_id}
    let raidHelperId = null;

    if (embed.url) {
      const urlParts = embed.url.split('/');
      raidHelperId = urlParts[urlParts.length - 1]; // Get last segment
    }

    if (!raidHelperId) {
      console.warn(`No event ID found in embed URL for: ${title}`);
      continue; // Skip events without valid ID
    }

    // Also extract Web View link if present
    let webViewUrl = null;
    if (embed.fields) {
      for (const field of embed.fields) {
        if (field.value && field.value.includes('raid-helper.dev/event/')) {
          const urlMatch = field.value.match(/raid-helper\.dev\/event\/(\d+)/);
          if (urlMatch) {
            webViewUrl = `https://raid-helper.dev/event/${urlMatch[1]}`;
          }
        }
      }
    }

    // ==================================================
    // EXTRACT EVENT TIME
    // ==================================================
    let eventTime = null;

    // Look for timestamp in embed fields (format: <t:1234567890:F>)
    if (embed.fields) {
      for (const field of embed.fields) {
        const timeMatch = field.value.match(/<t:(\d+):/);
        if (timeMatch) {
          eventTime = parseInt(timeMatch[1]);
          break; // Use first timestamp found
        }
      }
    }

    // Fallback: look in description
    if (!eventTime && description) {
      const timeMatch = description.match(/<t:(\d+):/);
      if (timeMatch) {
        eventTime = parseInt(timeMatch[1]);
      }
    }

    // ==================================================
    // EVENT FILTERING
    // ==================================================

    // OPTION 1: Process ALL events (use this for initial sync)
    // Comment this out and uncomment Option 2 after first run
    const shouldProcess = true;

    // OPTION 2: Process UPCOMING events only (use after initial sync)
    // Uncomment the lines below and comment out Option 1 above
    // const shouldProcess = eventTime && eventTime > currentTime;

    if (!shouldProcess) {
      continue; // Skip past events
    }

    // ==================================================
    // BUILD EVENT OBJECT
    // ==================================================

    const eventData = {
      // Raid-Helper event ID (this is the key!)
      raid_helper_id: raidHelperId,
      raid_helper_api_url: `https://raid-helper.dev/api/v2/events/${raidHelperId}`,
      web_view_url: webViewUrl,

      // Discord message metadata
      message_id: item.id,
      channel_id: item.channel_id,
      discord_created_at: item.timestamp || new Date().toISOString(),

      // Event details from embed
      event_name: title,
      description: description,
      event_time: eventTime,
      event_time_readable: eventTime ? new Date(eventTime * 1000).toISOString() : null,

      // Embed metadata
      color: embed.color || null,
      thumbnail_url: embed.thumbnail ? embed.thumbnail.url : null,
      image_url: embed.image ? embed.image.url : null,

      // Extract all fields for additional data
      fields: embed.fields || [],

      // Footer often contains signup counts
      footer_text: embed.footer ? embed.footer.text : null,

      // URL for the event (Discord channel link)
      url: embed.url || null,

      // Flag for processing
      is_from_discord: true,
      processed_at: new Date().toISOString(),

      // Determine if event is past or upcoming
      is_past_event: eventTime ? eventTime < currentTime : false,
      time_until_event: eventTime ? eventTime - currentTime : null
    };

    events.push(eventData);
  }
}

// ==================================================
// SUMMARY LOGGING
// ==================================================

console.log(`Processed ${events.length} Raid-Helper events`);
console.log(`Current time: ${new Date(currentTime * 1000).toISOString()}`);

if (events.length > 0) {
  const upcomingCount = events.filter(e => !e.is_past_event).length;
  const pastCount = events.filter(e => e.is_past_event).length;

  console.log(`- Upcoming events: ${upcomingCount}`);
  console.log(`- Past events: ${pastCount}`);
  console.log(`First event: ${events[0].event_name} (${events[0].event_time_readable})`);
}

// Return array of events for next node to iterate
return events.map(event => ({ json: event }));
