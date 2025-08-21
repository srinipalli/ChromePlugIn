// ======= CONFIG =======
// 1) Get an API key from https://aistudio.google.com/app/apikey
// 2) Paste it below. (For production, consider adding an options page & chrome.storage)
const GEMINI_API_KEY = "Add You API Key";

// Model: gemini-1.5-flash or gemini-1.5-flash-8b
const GEMINI_MODEL = "gemini-1.5-flash";

// Simple source to parse (stable editorial feed). Region-independent but not official Netflix API.
const SOURCE_URL = "https://www.whats-on-netflix.com/whats-new/";

// ======= HELPERS =======
async function fetchHtml(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to fetch source (${res.status})`);
  return await res.text();
}

/**
 * Ask Gemini to extract latest MOVIES (not shows) from the HTML
 * Return a strict JSON array: [{title, release_date, genre, country?, url?}]
 */
async function extractMoviesWithGemini(html) {
  // Gemini REST: generateContent
  // Docs: https://ai.google.dev/api/rest/v1beta/models.generateContent
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const prompt = `
You are given HTML from a "what's new on Netflix" page.

TASK:
- Extract only MOVIES that are new or newly added.
- For each item return: 
  - "title" (string, required)
  - "release_date" (string, best-effort; allow YYYY or YYYY-MM-DD or empty if unknown)
  - "genre" (string, best-effort; empty if unknown)
  - "country" (string, optional best-effort; empty if unknown)
  - "url" (string, if present in HTML; else empty)
- Exclude TV series unless clearly marked as a Netflix movie.
- Return JSON ONLY. No extra prose.

OUTPUT FORMAT:
[
  {
    "title": "Example Movie",
    "release_date": "2025-08-10",
    "genre": "Action",
    "country": "US",
    "url": "https://..."
  }
]
If nothing found, return [].

HTML START
${html}
HTML END
`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      // Ask Gemini to respond as pure JSON (no code fences, no commentary)
      responseMimeType: "application/json",
      temperature: 0.2,
      topP: 0.9
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${t || res.statusText}`);
  }

  const data = await res.json();

  // Gemini JSON output will be in data.candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // Be defensive: if model ever returns code fences, strip them.
  const clean = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    // If parsing fails, return empty list to avoid crashing the UI
    console.warn("Failed to parse Gemini JSON. Raw:", clean);
    parsed = [];
  }

  // Normalize fields
  return (Array.isArray(parsed) ? parsed : []).map(item => ({
    title: (item.title || "").toString().trim(),
    release_date: (item.release_date || "").toString().trim(),
    genre: (item.genre || "").toString().trim(),
    country: (item.country || "").toString().trim(),
    url: (item.url || "").toString().trim()
  })).filter(x => x.title);
}

// ======= MESSAGE HANDLER =======
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "getLatestMovies") {
    (async () => {
      try {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("PASTE_")) {
          throw new Error("Set your Google AI Studio API key in background.js");
        }
        const html = await fetchHtml(SOURCE_URL);
        const movies = await extractMoviesWithGemini(html);
        sendResponse(movies);
      } catch (err) {
        console.error(err);
        sendResponse({ error: err.message });
      }
    })();
    return true; // keep the channel open for async sendResponse
  }
});
