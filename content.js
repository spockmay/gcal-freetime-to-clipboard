// content.js
document.addEventListener('contextmenu', () => {
  const url = window.location.href;
  
  // Regex to find the date pattern in Google Calendar's URL: /r/day/YYYY/MM/DD
  const dateMatch = url.match(/\/day\/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    // Format to YYYYMMDD with padding
    const formatted = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
    
    console.log("Day View detected. Target Date:", formatted);
    chrome.runtime.sendMessage({ type: "SET_TARGET_DATE", date: formatted });
  } else {
    // Optional: Notify the user they aren't in Day View
    console.log("Not in Day View. Extension is currently optimized for Day View only.");
  }
}, true);