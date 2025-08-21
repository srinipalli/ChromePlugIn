// Background service worker for MV3
function saveItem(text, ts) {
  chrome.storage.local.get({ clipboard: [] }, (data) => {
    let clipboard = Array.isArray(data.clipboard) ? data.clipboard : [];
    // Clean invalid entries
    clipboard = clipboard.filter(i => i && typeof i.text === "string");

    if (clipboard.length && clipboard[0].text === text) {
      // Update timestamp if the newest is same text
      clipboard[0].ts = ts || Date.now();
    } else {
      const item = { id: (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), text, ts: ts || Date.now() };
      clipboard.unshift(item);
      // Cap to 200 entries
      if (clipboard.length > 200) clipboard.length = 200;
    }
    chrome.storage.local.set({ clipboard });
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "copied" && msg.text) {
    saveItem(msg.text, msg.ts);
  }
  // No sendResponse needed
  return false;
});
