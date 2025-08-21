document.getElementById("applyFont").addEventListener("click", async () => {
  let font = document.getElementById("fontSelect").value;

  chrome.storage.sync.set({ chosenFont: font });

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: changeFont,
    args: [font]
  });
});

function changeFont(font) {
  document.body.style.fontFamily = font + ", sans-serif";
}
