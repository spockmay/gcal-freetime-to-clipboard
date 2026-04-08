// content.js
document.addEventListener('contextmenu', () => {
  const url = window.location.href;
  
  // Regex to find the date pattern in Google Calendar's URL: /r/day/YYYY/MM/DD
  const dateMatch = url.match(/\/day\/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    // Format to YYYYMMDD with padding
    const formatted = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
    
    logger.debug("Day View detected. Target Date:", formatted);
    chrome.runtime.sendMessage({ type: "SET_TARGET_DATE", date: formatted });
  } else {
    // Optional: Notify the user they aren't in Day View
    logger.debug("Not in Day View. Extension is currently optimized for Day View only.");
  }
}, true);

// content.js

function showToast(message) {
  // 1. Create the toast element
  const toast = document.createElement('div');
  toast.innerText = message;
  
  // 2. Style it (Modern, dark, and centered at the bottom)
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#323232',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    zIndex: '9999',
    fontFamily: 'Roboto, Arial, sans-serif',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  document.body.appendChild(toast);

  // 3. Fade in
  setTimeout(() => { toast.style.opacity = '1'; }, 10);

  // 4. Fade out and remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "COPY_TO_CLIPBOARD") {
    navigator.clipboard.writeText(request.text).then(() => {
      showToast("Availability copied to clipboard!");
    }).catch(err => {
      showToast("Error copying to clipboard.");
      logger.error(err);
    });
  }
});