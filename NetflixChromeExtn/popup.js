const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
document.getElementById("fetch").addEventListener("click", async () => {
  statusEl.textContent = "Fetching…";
  resultsEl.innerHTML = "";
  try {
    const movies = await chrome.runtime.sendMessage({ action: "getLatestMovies" });
    statusEl.textContent = movies?.length ? `Found ${movies.length} item(s)` : "No results.";
    (movies || []).forEach(m => {
      const li = document.createElement("li");
      const pieces = [
        m.title || "Untitled",
        m.release_date ? `(${m.release_date})` : "",
        m.genre ? `– ${m.genre}` : ""
      ].filter(Boolean);
      li.textContent = pieces.join(" ");
      resultsEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span class="error">Error: ${err.message}</span>`;
  }
});
