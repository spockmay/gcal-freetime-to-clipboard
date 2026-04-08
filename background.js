// background.js
let clickedDate = null; // Our "state" variable

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_TARGET_DATE") {
    clickedDate = message.date; // Store "YYYYMMDD"
    console.log("Global target date updated:", clickedDate);
    sendResponse({ status: "captured" });
  }
  return true;
});

// 1. Create the right-click menu item when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extract-free-time",
    title: "Copy Free Times to Clipboard",
    contexts: ["all"],
    documentUrlPatterns: ["*://calendar.google.com/*"]
  });
  console.log("Context menu created.");
});

// 2. Add a listener to handle the click event
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extract-free-time") {
    console.log("Attempting to get Auth Token...");
    handleCopyFreetime();
  }
});

async function handleCopyFreetime() {
  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error("Auth failed:", chrome.runtime.lastError);
      return;
    }

    try {
      // 1. Get User Settings (Timezone is key for engineering precision)
      const settingsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/settings/timezone', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const settings = await settingsResponse.json();
      const timeZone = settings.value;

      // 2. Define the work window based on our global clickedDate
      const window = getWorkWindow(timeZone, clickedDate);

      // 3. Query the FreeBusy API
      const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: window.timeMin,
          timeMax: window.timeMax,
          timeZone: timeZone,
          items: [{ id: 'primary' }]
        })
      });

      const data = await response.json();
      const busySlots = data.calendars.primary.busy;

      // 4. Calculate the gaps
      const gaps = findGaps(busySlots, window.timeMin, window.timeMax);
      const output = formatGaps(gaps, timeZone, clickedDate);

      console.log(output);
      
      // TODO: Send 'output' to the clipboard via the Offscreen API or Content Script
      
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    }
  });
}

async function getCalendarSettings(token) {
  // Fetch the primary calendar metadata to get the timezone
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  console.log("Your Calendar Timezone:", data.timeZone);
  return data.timeZone; // e.g., "America/New_York"
}

function getWorkWindow(timeZone, targetDateStr) {
  // targetDateStr is "20260415"
  const year = parseInt(targetDateStr.substring(0, 4));
  const month = parseInt(targetDateStr.substring(4, 6)) - 1; // 0-indexed
  const day = parseInt(targetDateStr.substring(6, 8));

  // Create a base date object for that specific day in the local timezone
  // We use the string approach to ensure it anchors to the correct local day
  const dateBase = new Date(year, month, day);
  
  // Create ISO strings for 9:00 AM and 5:00 PM on THAT day
  // Note: We use the browser's local time constructor here as it aligns 
  // with your system's timezone (Ohio/Eastern)
  const start = new Date(year, month, day, 9, 0, 0);
  const end = new Date(year, month, day, 17, 0, 0);
  
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
}

async function fetchFreeBusy(token, window) {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin: window.timeMin, // Now using the calculated 9 AM
        timeMax: window.timeMax, // Now using the calculated 5 PM
        items: [{ id: 'primary' }] 
      })
    });

    const data = await response.json();
    const busySlots = data.calendars.primary.busy;
    
    console.log("Success! Busy slots within your work window:");
    console.table(busySlots);
    
    return busySlots;
  } catch (error) {
    console.error("API Fetch failed:", error);
  }
}

function calculateFreeSlots(busySlots) {
  const freeSlots = [];
  const now = new Date();
  
  // Define the end of our search window (e.g., 5:00 PM today)
  const endOfSearch = new Date();
  endOfSearch.setHours(17, 0, 0, 0); 

  let lastSlotEnd = now;

  busySlots.forEach(busy => {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    // If there is a gap between the last event and this one, it's a free slot
    if (busyStart > lastSlotEnd) {
      freeSlots.push({ start: lastSlotEnd, end: busyStart });
    }
    lastSlotEnd = busyEnd;
  });

  // Check for one final gap between the last event and the end of the day
  if (lastSlotEnd < endOfSearch) {
    freeSlots.push({ start: lastSlotEnd, end: endOfSearch });
  }

  return freeSlots;
}


function findGaps(busySlots, workStart, workEnd) {
    let freeSlots = [];
    let currentTime = new Date(workStart);
    const endTime = new Date(workEnd);

    // 1. Sort busy slots by start time just in case
    busySlots.sort((a, b) => new Date(a.start) - new Date(b.start));

    for (let slot of busySlots) {
        let slotStart = new Date(slot.start);
        let slotEnd = new Date(slot.end);

        // If the meeting starts after our current pointer, we found a gap!
        if (slotStart > currentTime && (new Date(slotStart) - currentTime) / (1000 * 60)>15) {
            freeSlots.push({
                start: currentTime.toISOString(),
                end: slotStart.toISOString()
            });
        }

        // Move the pointer to the end of this meeting 
        // (but only if it moves us forward - handles overlapping events)
        if (slotEnd > currentTime) {
            currentTime = slotEnd;
        }
    }

    // 2. Check for a final gap between the last meeting and end of work day
    if (currentTime < endTime) {
        freeSlots.push({
            start: currentTime.toISOString(),
            end: endTime.toISOString()
        });
    }

    return freeSlots;
}

function formatGaps(gaps, timeZone, targetDateStr) {
    if (gaps.length === 0) return "No free time found during work hours.";

    // 1. Parse our YYYYMMDD string for the title
    const year = parseInt(targetDateStr.substring(0, 4));
    const month = parseInt(targetDateStr.substring(4, 6)) - 1;
    const day = parseInt(targetDateStr.substring(6, 8));
    const dateObj = new Date(year, month, day);

    const friendlyDate = dateObj.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    });

    // 2. Get the timezone abbreviation (e.g., "EDT")
    const tzName = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        timeZoneName: 'short'
    }).formatToParts(new Date())
      .find(p => p.type === 'timeZoneName').value;

    // 3. Format the lines
    const gapLines = gaps.map(gap => {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true, 
            timeZone: timeZone 
        };
        const start = new Date(gap.start).toLocaleTimeString([], options);
        const end = new Date(gap.end).toLocaleTimeString([], options);
        return `* ${start} - ${end}`;
    }).join('\n');

    return `Availability on ${friendlyDate}:\n${gapLines} (${tzName})`;
}