const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const clearAllBtn = document.getElementById("clearAll");

let items = []; // full
let filtered = []; // filtered

function fmtTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (_) {
    return "";
  }
}

function render() {
  const renderItems = filtered;
  listEl.innerHTML = "";
  if (!renderItems.length) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  for (const it of renderItems) {
    const li = document.createElement("li");
    li.className = "item";

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = it.text;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = fmtTime(it.ts);

    const btns = document.createElement("div");
    btns.className = "btns";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn";
    copyBtn.title = "Copy back";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(it.text);
      } catch (err) {
        console.error("Copy failed", err);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn danger";
    delBtn.title = "Delete";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteById(it.id);
    });

    btns.appendChild(copyBtn);
    btns.appendChild(delBtn);

    li.appendChild(text);
    li.appendChild(meta);
    li.appendChild(btns);

    // Clicking the item also copies
    li.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(it.text);
      } catch (err) {
        console.error("Copy failed", err);
      }
    });

    listEl.appendChild(li);
  }
}

function applySearch() {
  const q = (searchEl.value || "").toLowerCase();
  if (!q) {
    filtered = items.slice();
  } else {
    filtered = items.filter((i) => i.text.toLowerCase().includes(q));
  }
  render();
}

function load() {
  chrome.storage.local.get({ clipboard: [] }, (data) => {
    items = Array.isArray(data.clipboard) ? data.clipboard : [];
    // Sort by newest first
    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    filtered = items.slice();
    render();
  });
}

async function deleteById(id) {
  chrome.storage.local.get({ clipboard: [] }, (data) => {
    const arr = Array.isArray(data.clipboard) ? data.clipboard : [];
    const next = arr.filter((i) => i && i.id !== id);
    chrome.storage.local.set({ clipboard: next }, () => {
      items = next;
      applySearch();
    });
  });
}

function clearAll() {
  chrome.storage.local.set({ clipboard: [] }, () => {
    items = [];
    filtered = [];
    render();
  });
}

searchEl.addEventListener("input", applySearch);
clearAllBtn.addEventListener("click", clearAll);

// Initial load & keep updated if storage changes from background
load();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.clipboard) {
    items = changes.clipboard.newValue || [];
    applySearch();
  }
});
