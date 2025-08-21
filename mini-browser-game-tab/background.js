// Opens the game in a dedicated tab when the extension icon is clicked.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('game.html') });
});
