
# ICC Matches (Gemini Flash 2.5) – Chrome Extension (v2.5.0)

Lists ICC full-member nations and fetches upcoming **Men** & **Women** matches using **Gemini Flash 2.5**.
This build enforces JSON output via `response_mime_type: application/json` and includes a Debug toggle to inspect raw responses.

## Install
1. Go to `chrome://extensions` → enable **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Click the extension icon → **Options** → paste your **Gemini API key**.

## Use
- Choose an ICC nation (defaults to India).
- Set how many upcoming matches (1–10).
- (Optional) Toggle **Show raw JSON** to see API responses for debugging.
- Click **Upcoming Matches** to call Gemini; the popup renders two tables (Men, Women).

## Config
- Model ID is set in `popup.js` as:
  ```js
  const API_MODEL = "gemini-2.5-flash";
  ```
  If your account uses a different identifier, change it and reload the extension.

## Files
- `manifest.json` – MV3 manifest, declares popup & options page, storage permission, and Google API host permission.
- `popup.html` – UI for selecting nation & limit, and viewing results.
- `popup.js` – Controller: builds prompt, calls Gemini, parses JSON, renders tables (uses Flash 2.5).
- `constants.js` – Static list of ICC full members.
- `styles.css` – Dark, card-style UI.
- `options.html` / `options.js` – Save/retrieve API key via `chrome.storage.sync`.
- `README.md` – This file.
