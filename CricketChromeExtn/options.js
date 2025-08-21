
const keyInput = document.getElementById('key');
const saveBtn = document.getElementById('save');
const msg = document.getElementById('msg');

chrome.storage.sync.get(["GEMINI_API_KEY"], (res) => {
  if (res.GEMINI_API_KEY) keyInput.value = res.GEMINI_API_KEY;
});

saveBtn.addEventListener('click', () => {
  const v = (keyInput.value || "").trim();
  chrome.storage.sync.set({ GEMINI_API_KEY: v }, () => {
    msg.textContent = v ? "Saved!" : "Cleared.";
    setTimeout(()=> msg.textContent = "", 1500);
  });
});
