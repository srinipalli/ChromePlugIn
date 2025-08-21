 // ==============================
// service_worker.js (MV3)
// ==============================

// ==== 1) CONFIG ====
// LLM (Gemini) — hard-code your API key here (demo/dev only)
const GEMINI_API_KEY = "Your API Key";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// (Optional) Notification icon (exists in /icons/)
const ICON_128 = "icons/icon128.png";

// ==== 2) CONTEXT MENU: capture selection, save + try to copy ====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendSelectionToPopup",
    title: "Move selection to extension (and clipboard)",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "sendSelectionToPopup") return;
  const text = (info.selectionText || "").trim();
  if (!text) return;

  // Save in session for popup fallback
  await chrome.storage.session.set({ latestSelection: text });

  // Try to copy to clipboard by injecting into the page (more reliable than SW)
  let copied = false;
  try {
    if (tab?.id) {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        args: [text],
        func: async (t) => {
          try { await navigator.clipboard.writeText(t); return "ok"; }
          catch (e) { return "err:" + (e?.message || e); }
        }
      });
      copied = res?.result === "ok";
    }
  } catch {
    copied = false;
  }

  // Quick badge tick
  try {
    await chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1200);
  } catch {}

  // Toast
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: ICON_128,
      title: "Selection captured",
      message: copied ? "Saved and copied to clipboard." : "Saved. (Clipboard may be blocked here.)"
    });
  } catch {}
});

// ==== 3) MESSAGE BUS: popup <-> service worker ====
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Generate LinkedIn post via LLM
  if (msg?.type === "GEN_LINKEDIN") {
    genLinkedInPost(msg.selection)
      .then(post => sendResponse({ post }))
      .catch(err => sendResponse({ error: err?.message || String(err) }));
    return true; // async
  }

  // Open LinkedIn composer and insert text
  if (msg?.type === "LI_COMPOSE") {
    openLinkedInComposerWithText(msg.body)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ error: err?.message || String(err) }));
    return true; // async
  }
});

// ==== 4) LLM CALL (Gemini) ====
async function genLinkedInPost(selection) {
  const input = (selection || "").trim();
  if (!input) throw new Error("No input text. Select or paste some text first.");
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("PUT-YOUR")) {
    throw new Error("Gemini API key not set in service_worker.js");
  }

  const prompt = `
Rewrite the following text as a concise, professional LinkedIn post.
- Start with a short hook
- ≤ 1100 characters
- Short paragraphs with line breaks
- End with a light CTA or question
- Add 2–3 relevant hashtags

SOURCE:
"""${input}"""

OUTPUT: Post only.
`.trim();

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  let data;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) {
    const msg = data?.error?.message || `${resp.status} ${resp.statusText}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("")?.trim() || "";
  if (!text) throw new Error("Empty response from model.");
  return text;
}

// ==== 5) LINKEDIN: open composer and insert text ====
async function openLinkedInComposerWithText(text) {
  if (!text?.trim()) throw new Error("Empty post body.");

  // 1) Open feed (new tab)
  const tab = await chrome.tabs.create({ url: "https://www.linkedin.com/feed/" });

  // 2) Wait for initial load (SPA will continue hydrating)
  await waitForTabComplete(tab.id);

  // 3) Inject a robust script to open composer and insert text
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [text],
    func: async (postText) => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      // Prefer visible element containing the label text (case-insensitive)
      const queryStartPostByText = () => {
        const needle = "start a post";
        const nodes = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"]'));
        const visible = nodes.filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (rect.width < 10 || rect.height < 10) return false;
          return true;
        });
        for (const el of visible) {
          const t = (el.innerText || el.textContent || "").trim().toLowerCase();
          if (t.includes(needle)) return el;
        }
        return null;
      };

      const clickStartPost = async () => {
        let btn = queryStartPostByText();
        if (!btn) {
          btn =
            document.querySelector('button[aria-label*="Start a post" i]') ||
            document.querySelector('button[aria-label*="post" i]') ||
            document.querySelector('button.share-box-feed-entry__trigger') ||
            document.querySelector('button[data-test-id="share-box-feed-entry"]') ||
            document.querySelector('a[role="button"][data-control-name="sharebox_trigger"]');
        }
        if (!btn) return false;
        // Fire a real click
        const ev = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
        btn.dispatchEvent(ev);
        if (typeof btn.click === "function") btn.click();
        return true;
      };

      const waitForEditor = async () => {
        for (let i = 0; i < 80; i++) { // ~20s
          const editor =
            document.querySelector('div[role="textbox"][contenteditable="true"]') ||
            document.querySelector('div[contenteditable="true"][data-placeholder]') ||
            document.querySelector('div[contenteditable="true"][aria-multiline="true"]');
          if (editor && editor.offsetParent !== null) return editor;
          await sleep(250);
        }
        return null;
      };

      // Try to open composer
      let opened = false;
      for (let i = 0; i < 20; i++) {
        opened = await clickStartPost();
        if (opened) break;
        await sleep(400);
      }
      if (!opened) throw new Error('Could not find the "Start a post" trigger.');

      // Wait for the editor
      const editor = await waitForEditor();
      if (!editor) throw new Error("LinkedIn post editor not found.");

      // Focus and insert text
      editor.focus();
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, postText);
      } catch {
        editor.textContent = postText; // fallback
      }

      // Let LinkedIn know content changed
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  // 4) Notify user
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: ICON_128,
      title: "Composer ready",
      message: "Your text has been inserted. Review & click Post."
    });
  } catch {}
}

// ==== 6) HELPERS ====
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const start = Date.now();
  try {
    const t = await chrome.tabs.get(tabId);
    if (t.status === "complete") return;
  } catch {}
  return new Promise((resolve) => {
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    const timer = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(); // proceed anyway; injected script has its own retries
      }
    }, 500);
  });
}
