// utils.js
globalThis.logger = {
  debug: (...args) => {
    const isDev = !('update_url' in chrome.runtime.getManifest());
    if (isDev) console.log("[FREETIME-Debug]:", ...args);
  },
  error: (...args) => {
    console.error("[FREETIME-Error]:", ...args);
  }
};