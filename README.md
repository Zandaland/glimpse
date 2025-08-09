# 🔮 Glimpse

**Intelligent AI assistant sidebar** with YouTube transcript analysis, screenshot capture, auto-attach active tab content, interactive help, and file upload support using Gemini and OpenRouter APIs. Now supports Google Search grounding (citations) for Gemini.

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.5-blue)
![Firefox](https://img.shields.io/badge/Firefox-Compatible-orange)

## ✨ Features

- 🤖 **AI Chat Interface** - Clean, modern sidebar interface for AI conversations
- 📺 **YouTube Transcript Analysis** - Fetch and analyze YouTube video transcripts
- 📸 **Screenshot Capture** - Capture and analyze screenshots with AI
- 📄 **Tab Content Capture** - Extract and analyze content from web pages
- 🔗 **Auto‑include Active Tab** - Optionally auto‑attach the current tab’s main content when sending
- 📁 **File Upload Support** - Upload and analyze documents, images, and more
- 🔑 **Multiple AI Providers** - Support for Gemini and OpenRouter APIs
- 🌐 **Google Search Grounding** - Let Gemini consult the web and add inline citations (toggle in Settings)
- 💾 **Chat History** - Save and manage conversation history locally
- ⚙️ **Configurable Settings** - Customize API keys, models, and preferences
- 🆘 **Built‑in Tutorial** - Help button opens a step‑by‑step guide with interactive actions
- 💬 **@Mentions for Tabs** - Type `@` to attach open tabs as context
- 🔁 **Copy/Retry** - Copy any message and retry AI responses easily
- 🧱 **Rich Code Blocks** - Clean formatting with copy buttons
- 🧑‍💼 **Personalization (Profile)** - Add “About me,” attach `.txt/.md/.pdf` files, auto‑generate a compact profile summary, and choose whether to include it by default or only for the next message
- 🔐 **Privacy First** - All data stored locally, no analytics or tracking

## 🚀 Installation

### 🦊 Firefox Add-ons Store (Recommended)

**[📥 Install from Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/glimpse-ai-chat-sidebar/)**

The easiest way to install Glimpse is directly from the official Firefox Add-ons store.

### Manual Installation

#### Method 1: Temporary Installation (Development)
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file from this repository
5. The extension will be loaded until Firefox restarts

#### Method 2: Manual XPI Installation
1. Download or clone this repository
2. Run `package-simple.ps1` to create the `.xpi` file
3. Drag and drop the `.xpi` file into Firefox
4. Confirm installation when prompted
### Chrome/Edge (Experimental)
While primarily designed for Firefox, basic functionality may work in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the repository folder

## ⚙️ Setup

1. **Install the extension** using one of the methods above
2. **Open the sidebar** by pressing `F1` or `Ctrl+Shift+Y`
3. **Configure API keys** in the settings:
   - **Gemini API**: Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **OpenRouter API**: Get your API key from [OpenRouter](https://openrouter.ai/keys)
4. Optional: Enable **Google Search grounding** to get real‑time citations
5. Optional: Enable **Auto‑include active tab** to attach the current page content automatically
6. **Start chatting** with your AI assistant!

### Keyboard & Quick actions
- F1 or Ctrl+Shift+Y: toggle sidebar
- Click the logo: start a new session
- Enter to send, Shift+Enter for newline
- Use the toolbar to Capture Page, Screenshot, YouTube Analysis, or Attach Files

## 🛠️ Development

### Quick Start
1. **Clone the repository**
   ```bash
   git clone https://github.com/Zandaland/glimpse.git
   cd glimpse
   ```

2. **Make changes** to any source files

3. **Package the extension**
   ```powershell
   .\package-simple.ps1
   ```

4. **Test in Firefox** by dragging the new `.xpi` file into the browser

### File Structure
```
glimpse/
├── manifest.json      # Extension configuration
├── background.js      # Background processes and API
├── sidebar.html       # Main UI structure
├── sidebar.css        # Main styling
├── sidebar.js         # Core functionality and AI logic
├── retry.css          # Additional styling
├── transcript-server/ # Optional helper for YouTube transcripts (Docker/Python)
├── icons/             # Extension icons
├── package-simple.ps1 # Build script
└── README.md          # This file
```

### Key Functions (sidebar.js)
- `sendMessage()` - Handles user input and AI responses
- `callGeminiAPI()` - Makes API calls to AI services
- `captureTabAsFile()` / `captureCurrentTab()` - Extract main content from active tab
- `analyzeYouTubeVideo()` - YouTube transcript extraction
- `captureScreenshot()` - Screenshot functionality
- `addMessage()` - Message rendering and display

### Google Search Grounding
- Toggle “Enable Google Search grounding” in Settings. For Gemini 2.x it uses `google_search`; for Gemini 1.5 it falls back to legacy dynamic retrieval. Responses include inline citations when provided.

### Auto‑include Active Tab
- Toggle “Auto‑include active tab when sending.” The extension captures the main content from the current tab and attaches it as a “Webpage” file (skips internal pages like `about:`). This works like the Capture Page button, but automatically.

### Personalization (Profile)
Glimpse can personalize responses using a lightweight profile you control.

- Open Settings → “Personalization (Profile)”
  - Write your “About me” details (interests, goals, writing style, do/don’ts)
  - Optionally attach reference files (`.txt`, `.md`, `.pdf`)
  - Click “Generate summary” to create a compact profile summary that the model can use efficiently
  - Choose how to include your profile:
    - “Include by default” — always include in prompts
    - “Include for the next message only” — one‑off include
- Your profile is stored locally in the browser. You can edit or remove it anytime.
- When included, Glimpse prepends a small `[User Profile]` context block to your conversation turn.

## 🔒 Privacy

Glimpse is designed with privacy in mind:
- **Local Storage Only** - All settings, API keys, and chat history are stored locally in your browser
- **No Analytics** - We don't collect any usage data or analytics
- **Direct API Calls** - Your data goes directly to your chosen AI provider (Gemini/OpenRouter)
- **No Cloud Storage** - We don't store any of your data on our servers

For full details, see our [Privacy Policy](PRIVACY-POLICY.md).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/Zandaland/glimpse/issues) on GitHub.

---

**Made with ❤️ by [Zandaland](https://github.com/Zandaland)**