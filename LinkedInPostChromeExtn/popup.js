 async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Try 1: read selection directly from the page at this moment (most reliable)
async function readSelectionViaScripting() {
  const tab = await getActiveTab();
  if (!tab?.id) return "";
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.getSelection()?.toString() || "").trim(),
      world: "MAIN"
    });
    return (res?.result || "").trim();
  } catch (e) {
    return "";
  }
}

// Try 2: ask content.js (works when injected; might be empty if selection lost focus)
async function readSelectionViaMessage() {
  const tab = await getActiveTab();
  if (!tab?.id) return "";
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" });
    return (res?.text || "").trim();
  } catch {
    return "";
  }
}

// Try 3: fallback to last saved
async function readSelectionFromSession() {
  const { latestSelection } = await chrome.storage.session.get("latestSelection");
  return (latestSelection || "").trim();
}

async function loadSelection() {
  const box = document.getElementById("selectionBox");
  let text = await readSelectionViaScripting();
  if (!text) text = await readSelectionViaMessage();
  if (!text) text = await readSelectionFromSession();
  box.value = text;
}

function setBusy(b) {
  document.getElementById("genBtn").disabled = b;
  document.getElementById("spinner").style.display = b ? "inline" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  loadSelection();
  
  document.getElementById("liComposeBtn").addEventListener("click", async () => {
  const postBody = (document.getElementById("outputBox").value || "").trim();
  if (!postBody) {
    alert("Nothing to post. Generate your LinkedIn post first.");
    return;
  }

  const res = await chrome.runtime.sendMessage({
    type: "LI_COMPOSE",
    body: postBody
  });

  if (res?.error) alert(res.error);
});


  document.getElementById("refreshBtn").addEventListener("click", loadSelection);

  document.getElementById("genBtn").addEventListener("click", async () => {
    setBusy(true);
    try {
      const selection = document.getElementById("selectionBox").value.trim();
      if (!selection) { alert("No text selected."); return; }

      const res = await chrome.runtime.sendMessage({ type: "GEN_LINKEDIN", selection });
      if (res?.error) alert(res.error);
      else document.getElementById("outputBox").value = res.post || "";
    } finally {
      setBusy(false);
    }
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    const text = document.getElementById("outputBox").value || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Fallback: try execCommand (rarely needed)
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
  });

  
});
