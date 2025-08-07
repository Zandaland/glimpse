# Development Guide

## Quick Start

1. **Make changes** to any source files
2. **Package:** Run `package-simple.ps1`
3. **Install:** Drag new `ai-chat-sidebar.xpi` into browser

## File Overview

- **`manifest.json`** - Extension configuration
- **`background.js`** - Background processes and API
- **`sidebar.html`** - Main UI structure
- **`sidebar.css`** - All styling
- **`sidebar.js`** - Main functionality and AI logic
- **`retry.css`** - Retry button specific styles

## Key Functions (sidebar.js)

- `sendMessage()` - Handles user input and AI responses
- `callGeminiAPI()` - Makes API calls to AI services
- `analyzeYouTubeVideo()` - YouTube transcript extraction
- `fetchTranscriptFromServer()` - Backend transcript fetching
- `captureScreenshot()` - Screenshot functionality
- `addMessage()` - Message rendering and display

## Adding Features

1. Add UI elements to `sidebar.html`
2. Style them in `sidebar.css`
3. Add functionality in `sidebar.js`
4. Update manifest permissions if needed
5. Repackage and test

## Backend (Optional)

The Python backend (`transcript_server.py`) provides:
- YouTube transcript extraction via `youtube-transcript-api`
- Fallback when client-side extraction fails
- Deploy locally or on platforms like Render

Happy coding! 🚀
