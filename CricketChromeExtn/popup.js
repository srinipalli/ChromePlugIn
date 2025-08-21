
import { ICC_FULL_MEMBERS } from "./constants.js";

const nationSelect = document.getElementById('nation');
const fetchBtn = document.getElementById('fetch');
const results = document.getElementById('results');
const statusEl = document.getElementById('status');
const limitInput = document.getElementById('limit');
const raw = document.getElementById('raw');
const debug = document.getElementById('debug');

// Populate nations
ICC_FULL_MEMBERS.forEach(n => {
  const opt = document.createElement('option');
  opt.value = n; opt.textContent = n;
  nationSelect.appendChild(opt);
});
nationSelect.value = "India";

// === Model & URL for Gemini Flash 2.5 ===
const API_MODEL = "gemini-2.5-flash"; // If your account uses a different alias, change here.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent`;

const getApiKey = () => new Promise((resolve) => {
  chrome.storage.sync.get(["GEMINI_API_KEY"], (res) => resolve(res.GEMINI_API_KEY || ""));
});

function buildPrompt(nation, limit) {
    const today = new Date().toISOString().split('T')[0];

  return `You are a cricket schedule assistant. Today's date is ${today}.provide facts about upcoming international matches.
.Earlier you given all wrong data. choose the right source.Return the next ${limit} ICC-sanctioned upcoming international matches for the ${nation} men's national team AND the next 5 for the India women's national team.

For each match, provide:
- opponent (string),
- date (YYYY-MM-DD if known, else "TBD"),
- venue (city and stadium if known, else "TBD"),
- tournament (series/tournament name; "TBD" if unknown).

IMPORTANT:
- If a date/venue is uncertain, use "TBD" but DO NOT invent details.
- Output MUST be valid JSON ONLY with this exact shape:

{
  "men": [{"opponent":"","date":"","venue":"","tournament":""}],
  "women": [{"opponent":"","date":"","venue":"","tournament":""}]
}

No markdown, no commentary—JSON only.`;
}

function setStatus(msg, cls="muted") {
  statusEl.className = cls;
  statusEl.textContent = msg;
}

function renderTable(title, arr) {
  const wrap = document.createElement('div');
  wrap.className = "card";
  const safe = Array.isArray(arr) ? arr : [];
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h2 style="margin:0 0 6px;font-size:14px;">${title}</h2>
      <span class="pill">${safe.length} matches</span>
    </div>
    <div class="grid">
      <div>
        <table>
          <thead><tr><th>#</th><th>Opponent</th><th>Date</th></tr></thead>
          <tbody>
            ${safe.map((m,i)=>`
              <tr>
                <td>${i+1}</td>
                <td>${m.opponent || 'TBD'}</td>
                <td>${m.date || 'TBD'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div>
        <table>
          <thead><tr><th>Venue</th><th>Tournament</th></tr></thead>
          <tbody>
            ${safe.map((m)=>`
              <tr>
                <td>${m.venue || 'TBD'}</td>
                <td>${m.tournament || 'TBD'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  return wrap;
}

function extractJsonFromCandidates(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    if (typeof p.text === "string") {
      // Try clean JSON
      try { return JSON.parse(p.text.trim()); } catch {}
      // Try to grab first {...} block if extra text slipped in
      const m = p.text.match(/\{[\s\S]*\}$/m);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
    }
  }
  return null;
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(API_URL + "?key=" + encodeURIComponent(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const obj = extractJsonFromCandidates(data);
  if (!obj) throw new Error("Could not parse JSON from model response.");
  return { obj, raw: data };
}

fetchBtn.addEventListener('click', async () => {
  results.innerHTML = "";
  raw.style.display = 'none';
  raw.textContent = '';
  setStatus("Calling Gemini Flash 2.5…", "loading");
  const apiKey = await getApiKey();
  if (!apiKey) {
    setStatus("Please set your Gemini API key in Options.", "error");
    return;
  }
  const nation = nationSelect.value;
  const limit = Math.max(1, Math.min(10, parseInt(limitInput.value || "5", 10) || 5));
  try {
    const prompt = buildPrompt(nation, limit);
    const { obj, raw: rawResp } = await callGemini(apiKey, prompt);
    setStatus("Done.", "ok");
    if (debug.checked) {
      raw.style.display = 'block';
      raw.textContent = JSON.stringify(rawResp, null, 2);
    }
    results.appendChild(renderTable(`${nation} — Men`, obj.men));
    results.appendChild(renderTable(`${nation} — Women`, obj.women));
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Something went wrong.", "error");
  }
});
