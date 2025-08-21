(() => {
  function getSelectedInputText(el) {
    try {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (typeof start === "number" && typeof end === "number" && end > start) {
        return el.value.substring(start, end);
      }
      return "";
    } catch (e) {
      return "";
    }
  }

  function getCopiedText(e) {
    // 1) Try clipboardData if available
    try {
      if (e && e.clipboardData && typeof e.clipboardData.getData === "function") {
        const cd = e.clipboardData.getData("text/plain");
        if (cd) return cd;
      }
    } catch (_) {}

    // 2) Try window selection
    try {
      const sel = document.getSelection && document.getSelection();
      if (sel) {
        const s = sel.toString();
        if (s) return s;
      }
    } catch (_) {}

    // 3) Try focused input/textarea selection
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      const txt = getSelectedInputText(el);
      if (txt) return txt;
      // fallback to entire value if nothing selected (rare for copy)
      if (el.value) return el.value;
    }

    return "";
  }

  function send(text) {
    if (!text) return;
    // Normalize whitespace and trim
    const cleaned = text.replace(/\s+\n/g, "\n").replace(/\s{2,}/g, " ").trim();
    if (!cleaned) return;
    chrome.runtime.sendMessage({ type: "copied", text: cleaned, ts: Date.now() });
  }

  // Capture copy and cut
  document.addEventListener("copy", (e) => {
    const t = getCopiedText(e);
    if (t) send(t);
  }, true);

  document.addEventListener("cut", (e) => {
    const t = getCopiedText(e);
    if (t) send(t);
  }, true);
})();
