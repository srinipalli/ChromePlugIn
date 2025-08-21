chrome.storage.sync.get("chosenFont", ({ chosenFont }) => {
  if (chosenFont) {
    document.body.style.fontFamily = chosenFont + ", sans-serif";
  }
});
