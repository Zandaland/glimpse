# Button Separation Guide - Clean UI with Distinct Functions

## Overview
The AI sidebar extension now features three distinct buttons with clear separation of functionality:

### 🔤 **Text Capture Button** (Gray)
- **Purpose**: Captures text content from web pages
- **Function**: Extracts readable text, HTML structure, and metadata
- **Use Case**: Analyzing articles, documentation, text-heavy content

### 📷 **Screenshot Button** (Green)
- **Purpose**: Takes visual screenshots of the current tab
- **Function**: Captures the visual appearance of any web page
- **Use Case**: Analyzing layouts, visual content, UI elements, or when you need to "show" something to Gemini

### 🎬 **YouTube Analysis Button** (Red)
- **Purpose**: Comprehensive YouTube video analysis
- **Function**: Extracts video transcripts, metadata, and visual frames
- **Use Case**: Analyzing YouTube videos with both text (captions/transcript) and visual content

## Clean UI Design

### Button Layout
```
[🔤 Text] [📷 Screenshot] [🎬 YouTube]
```

### Color Coding
- **Text Capture**: Gray theme (neutral for text)
- **Screenshot**: Green theme (go/capture)
- **YouTube Analysis**: Red theme (YouTube brand color)

### Visual Feedback
- Loading states with animated icons during processing
- Clear tooltips and labels
- Disabled state during operations
- Success/error messages

## Technical Implementation

### Screenshot Functionality
```javascript
async captureScreenshot() {
    // Simple tab capture using browser.tabs.captureTab
    // Returns PNG image with basic metadata
    // Works on any accessible web page
}
```

### YouTube Analysis Functionality
```javascript
async analyzeYouTubeVideo() {
    // Validates YouTube URL first
    // Calls existing captureYouTubeVideoAnalysis method
    // Extracts: transcript, metadata, visual frames
    // Only works on YouTube video pages
}
```

### File Type Handling
- **Screenshots**: `isScreenshot: true` flag
- **YouTube Analysis**: `isYouTubeAnalysis: true` flag
- **Video Frames**: `isVideoFrame: true` flag

## User Experience

### When to Use Each Button

1. **Text Capture** 📝
   - Reading articles or documentation
   - Extracting text from forms or lists
   - Getting structured content from web pages

2. **Screenshot** 📸
   - Showing visual layouts or designs
   - Capturing error messages or UI states
   - Analyzing visual content that's hard to describe

3. **YouTube Analysis** 🎥
   - Understanding video content and captions
   - Getting comprehensive video summaries
   - Analyzing both what's said and what's shown

### Error Handling
- **Screenshot**: Works on most pages except browser internal pages
- **YouTube Analysis**: Only works on YouTube video pages
- **Text Capture**: Works on most accessible web content

## API Integration

### Gemini Processing
Each file type sends different context to Gemini 2.5 Flash:

```javascript
// Screenshot
`[Screenshot from: ${title}]
URL: ${url}
This is a screenshot captured from a web page. Please analyze what you see.`

// YouTube Analysis  
`[YouTube Video Analysis]
Title: ${title}
Channel: ${channel}
Transcript: ${transcript}
This includes both textual and visual content.`
```

## Benefits of Separation

1. **Clarity**: Each button has a specific, clear purpose
2. **Performance**: Users only capture what they need
3. **Context**: Gemini receives appropriately formatted data
4. **UX**: Clean, intuitive interface with color coding
5. **Flexibility**: Mix different capture types in one conversation

## Future Enhancements

- **Batch Processing**: Select multiple tabs for screenshot
- **Video Timestamps**: Capture specific video moments
- **Text + Screenshot**: Combined mode for complete page analysis
- **Settings Panel**: Configure capture quality and options
