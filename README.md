# 🔮 Glimpse

**Intelligent AI assistant sidebar** with YouTube transcript analysis, screenshot capture, tab content capture, and file upload support using Gemini and OpenRouter APIs.

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.5-blue)
![Firefox](https://img.shields.io/badge/Firefox-Compatible-orange)

## ✨ Features

- 🤖 **AI Chat Interface** - Clean, modern sidebar interface for AI conversations
- 📺 **YouTube Transcript Analysis** - Fetch and analyze YouTube video transcripts
- 📸 **Screenshot Capture** - Capture and analyze screenshots with AI
- 📄 **Tab Content Capture** - Extract and analyze content from web pages
- 📁 **File Upload Support** - Upload and analyze documents, images, and more
- 🔑 **Multiple AI Providers** - Support for Gemini and OpenRouter APIs
- 💾 **Chat History** - Save and manage conversation history locally
- ⚙️ **Configurable Settings** - Customize API keys, models, and preferences
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
4. **Start chatting** with your AI assistant!

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
├── icons/             # Extension icons
├── package-simple.ps1 # Build script
└── README.md          # This file
```

### Key Functions (sidebar.js)
- `sendMessage()` - Handles user input and AI responses
- `callGeminiAPI()` - Makes API calls to AI services
- `analyzeYouTubeVideo()` - YouTube transcript extraction
- `captureScreenshot()` - Screenshot functionality
- `addMessage()` - Message rendering and display

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