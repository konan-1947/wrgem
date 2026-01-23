# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rev AI Studio (wrgem) is a Node.js library that automates interaction with Google Gemini through AI Studio's web interface using Puppeteer browser automation. The library provides a programmatic way to chat with Gemini without requiring API keys, by automating the web browser to simulate user interactions.

## Architecture

### Core Components

- **WrgemClient** (`src/main.js`): Main client class that manages browser sessions and exposes public API
- **Browser Automation** (`src/init*.js`): Puppeteer-based browser initialization with stealth mode
- **Chat System** (`src/chat.js`): Handles sending messages and receiving responses from AI Studio
- **UI Components** (`UI_lite/`): React/Ink-based terminal UI for interactive chat experience
- **Session Management**: Automatic login persistence using browser user data directory

### Key Technologies

- **Puppeteer + Stealth Plugin**: Browser automation with anti-detection capabilities
- **Ink + React**: Terminal-based user interface components
- **Turndown**: HTML to Markdown conversion for AI responses
- **Chalk**: Terminal text styling

## Development Commands

### Installation
```bash
npm install
```

### Running Tests
```bash
npm test  # Runs examples/aistudio-example.js
```

### Running UI Mode
```bash
node UI_lite/index.js  # Terminal-based chat interface
```

### Core Library Usage
```bash
node index.js  # Entry point for programmatic usage
```

## Code Architecture Patterns

### Session-based Architecture
The library uses a persistent browser session pattern:
- First run: Opens visible browser for manual Google login
- Subsequent runs: Uses headless mode with saved session data
- Session data stored in `userDataDir` (default: `~/.wrgem_data`)

### Modular Function Design
Core functionality is split into focused modules:
- `init.js`: Session detection and routing
- `init_aistudio.js`: First-time setup with visible browser
- `initFromFile.js`: Headless reconnection from saved session
- `chat.js`: Message sending and response handling
- `_waitForResponse.js`: Polling-based response collection
- `close.js`: Cleanup and resource management

### Browser Automation Techniques

#### Anti-Detection Measures
- Stealth plugin to hide automation indicators
- Custom User-Agent strings
- Device metrics toggling to trigger UI re-renders
- Realistic interaction patterns (click, keyboard input)

#### Response Collection Strategy
- DOM polling every 500ms to detect response updates
- HTML extraction from `ms-cmark-node` elements
- Completion detection via footer elements or timeout
- Stream-like updates via `onUpdate` callbacks

### Error Recovery Patterns
- Automatic browser reconnection on session loss
- Graceful fallback selectors for UI elements
- Process-level cleanup handlers for resource management
- Global client registry for bulk cleanup operations

## File Structure

```
src/
├── main.js              # Main WrgemClient class
├── init.js              # Session detection & routing
├── init_aistudio.js     # First-time browser setup
├── initFromFile.js      # Headless session restoration
├── chat.js              # Message sending logic
├── _waitForResponse.js  # Response polling system
├── _checkIfLoggedIn.js  # Login status detection
├── htmlToMarkdown.js    # Response format conversion
├── close.js             # Cleanup utilities
└── utils.js             # Shared utilities

UI_lite/
├── index.js             # Terminal app entry point
├── components/          # React/Ink UI components
├── hooks/               # Custom React hooks
└── utils/               # UI-specific utilities

data_crawed/             # Research data for DOM selectors
```

## Important Implementation Notes

### Browser Session Management
- Sessions are stored in `userDataDir` and contain Google login cookies
- Multiple WrgemClient instances can run concurrently with separate sessions
- Browser instances auto-cleanup on process termination (SIGINT/SIGTERM)

### AI Studio DOM Interaction
- Primary input selector: `textarea[placeholder*="Enter"]`
- Response container: `.chat-turn-container .turn-content ms-cmark-node`
- Completion indicator: `.turn-footer button[iconname="thumb_up"]`
- Uses Ctrl+Enter for message submission

### Response Processing
- Raw HTML responses converted to Markdown using Turndown
- Streaming updates available via `onUpdate` callbacks
- Response completion detected by DOM footer elements or content stability

### Memory and Resource Management
- Automatic browser cleanup on process exit
- Global client registry tracks all active instances
- Explicit `close()` method for manual resource cleanup

## Testing and Debugging

### Session Testing
Test session persistence by running init multiple times:
```bash
node -e "const WrgemClient = require('./index'); const client = new WrgemClient(); client.init().then(r => console.log(r))"
```

### Chat Testing
Quick chat test:
```bash
node -e "const WrgemClient = require('./index'); const c = new WrgemClient(); c.init().then(() => c.request_aistudio('Hello')).then(r => console.log(r.data))"
```

### Browser Debugging
Set headless to false for visual debugging:
```javascript
await client.init({ headless: false })
```