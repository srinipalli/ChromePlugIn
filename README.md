This project explores multiple Chrome Extensions (Plugins) integrated with Large Language Models (LLMs) such as OpenAI GPT and Google Gemini.
Each plugin demonstrates how everyday browser utilities can be enhanced with AI-driven intelligence.

📌 Features & Plugins Explored

 

📊 Jira / Project Manager Plugin
Detects API calls and UI components on the current page, retrieves developer details, and provides a one-click Create Jira Defect option.

✍️ LinkedIn Post Generator
Select text on any page, send it to an LLM, and generate a ready-to-publish LinkedIn post.

🎬 Netflix Plugin
Lists the latest movies/shows from Netflix with LLM-powered summaries.

📋 Clipboard Manager
Stores everything you copy in your browser, with search and delete features.

🔤 Font Changer
Lets you change the font style on any website instantly.

🎮 Browser Game Plugin
A fun mini-game playable directly in the extension popup.

🔄 Architecture Flow

Manifest.json – Defines permissions & structure.

Content Script (content.js) – Captures DOM/page context.

Popup (popup.html + popup.js) – Provides user interface.

Background (service_worker.js) – Handles events, logic, and external API calls.

External LLM/API – Provides summarization, generation, or insights.

Result – Displayed in popup or injected back into the web page.

Installation

Clone or download this repository.

Open Chrome → Go to chrome://extensions/.

Enable Developer Mode.

Click Load Unpacked → Select the project folder.

The extension will now appear in your Chrome toolbar.

🛠️ How to Use

Click on the extension icon in Chrome.

Depending on the plugin:

Highlight text → Generate LinkedIn Post.

Open Netflix → View latest movie list.

Open Jira page → Capture API/UI details & create defect.

Or simply play a game, change fonts, or manage your clipboard.
