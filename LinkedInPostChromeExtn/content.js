let latestSelection = "";

document.addEventListener("selectionchange", () => {
  const t = (window.getSelection()?.toString() || "").trim();
  if (t) {
    latestSelection = t;
    chrome.storage.session.set({ latestSelection: t }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GET_SELECTION") {
    const now = (window.getSelection()?.toString() || "").trim();
    sendResponse({ text: now || latestSelection || "" });
  }
});
