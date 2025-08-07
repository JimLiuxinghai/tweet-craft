# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Twitter Super Copy** browser extension built with the **WXT (Web Extension Toolkit)** framework. It's a production-ready extension that enhances Twitter/X.com copying functionality with thread support, multiple formats (HTML, Markdown, text), screenshot capabilities, and multi-language support.

## Development Commands

### Core Development
- `pnpm dev` - Start development mode with hot reloading (Chrome)
- `pnpm dev:firefox` - Start development mode for Firefox
- `pnpm build` - Build extension for production (Chrome)
- `pnpm build:firefox` - Build extension for Firefox

### Packaging
- `pnpm zip` - Create distributable ZIP file for Chrome Web Store
- `pnpm zip:firefox` - Create distributable ZIP file for Firefox Add-ons

### Type Checking & Testing
- `pnpm compile` - Run TypeScript type checking without emitting files
- `pnpm postinstall` - Prepare WXT environment (runs automatically)
- Open `tests/test-runner.html` in browser to run 62 test suites
- Performance tests available at `tests/performance-runner.html`

## Project Architecture

### High-Level System Design

This is a sophisticated, **layered modular architecture** with clear separation of concerns:

```
├── entrypoints/        # WXT entry points (auto-generated manifest)
│   ├── background.ts      # Service worker (context menus, commands, messaging)
│   ├── content.ts         # Content script entry (dynamic import for performance)
│   └── popup/ # Extension popup UI
├── lib/   # Core business logic (8,000+ lines)
│ ├── content/        # Twitter content script integration
│   ├── parsers/       # Tweet parsing and thread detection
│   ├── formatters/        # Multi-format output (HTML/Markdown/Text)
│ ├── clipboard/         # Multi-tier clipboard API with fallbacks
│ ├── screenshot/     # snapdom-based screenshot system
│   ├── i18n/     # 6-language internationalization system
│   ├── utils/     # Performance, memory, error management
│   └── types/       # TypeScript type definitions
└── components/        # UI components and content script components
```

### Key Architectural Patterns

1. **Layered Architecture**: Clear separation between UI, business logic, and data access
2. **Dependency Injection**: Services are injected rather than directly instantiated
3. **Error Handling with Fallbacks**: Multi-tier fallback strategies (clipboard APIs, screenshot methods)
4. **Performance Optimization**: Batch processing, caching, memory management, intersection observers
5. **Internationalization**: Complete i18n system with automatic language detection

### Core System Components

#### 1. Twitter Content Integration (`lib/content/`)
- **TwitterContentScript**: Main orchestrator class that coordinates all functionality
- **Performance Management**: Batch processing (10 tweets at a time), intersection observers for visibility
- **Memory Management**: LRU cache (200 items max), 5-minute cleanup cycles
- **Error Recovery**: Multi-level error handling with user-friendly fallbacks

#### 2. Tweet Parsing System (`lib/parsers/`)
- **TweetParser**: Extracts structured data from Twitter DOM
- **ThreadParser**: Intelligent thread detection using multiple algorithms:
  - Number pattern recognition (`1/5`, `2/5`)
  - Self-reply detection
  - Visual continuity analysis
  - Thread connection line detection
- **MediaExtractor**: Handles images, videos, and embedded content

#### 3. Content Formatting (`lib/formatters/`)
- **ContentFormatter**: Converts parsed data to multiple output formats
- **HTML**: Structured markup with embedded styles
- **Markdown**: GitHub-flavored markdown with proper escaping
- **Text**: Clean plain text with preserved formatting

#### 4. Clipboard Management (`lib/clipboard/`)
- **Multi-tier API Strategy**:
  1. Modern Clipboard API (`navigator.clipboard.write()` - HTML + text)
  2. Fallback API (`navigator.clipboard.writeText()` - text only)
  3. Legacy API (`document.execCommand()` - maximum compatibility)
- **Copy History**: Persistent storage of last 50 copy operations
- **Batch Operations**: Support for thread copying and bulk operations

#### 5. Screenshot System (`lib/screenshot/`)
- **snapdom Integration**: Dynamic library loading for performance
- **Multi-format Export**: PNG, JPG, WebP with quality controls
- **Theme Support**: Light/dark/high-contrast theme adaptation
- **Custom Rendering**: Template-based HTML generation with caching

#### 6. Internationalization (`lib/i18n/`)
- **Languages**: English, Chinese, Japanese, Korean, Spanish, French
- **Smart Detection**: Browser language → Extension API → User preferences → Default
- **Dynamic Loading**: Locale switching without restart required

## Key Technical Features

### Performance Optimizations
- **Batch Processing**: DOM operations in chunks of 10 to prevent blocking
- **Intersection Observer**: Only process visible tweets
- **Debouncing**: 200ms delay for new tweet processing
- **Memory Management**: Automatic cleanup and garbage collection
- **Caching**: LRU cache for parsed tweet data

### Error Handling Strategy
- **Graceful Degradation**: Multiple fallback levels for every operation
- **Error Categorization**: Clipboard, parsing, network, DOM structure errors
- **User Feedback**: Specific error messages with actionable solutions
- **Cooldown System**: Prevents error spam from repeated failures

### Cross-Browser Compatibility
- **Manifest V3**: Chrome/Edge compatibility
- **Permission Minimization**: Only requests necessary permissions
- **HTTPS Required**: Modern clipboard APIs require secure context
- **Content Security Policy**: Full CSP compliance

## Extension Configuration

### Manifest Permissions
- `activeTab` - Access current tab content
- `clipboardWrite` - Write to system clipboard
- `storage` - Local settings and history persistence
- `contextMenus` - Right-click context menus
- `scripting` - Content script injection

### Host Permissions
- `https://twitter.com/*` - Original Twitter domain
- `https://x.com/*` - X.com rebrand domain

### Keyboard Shortcuts
- `Ctrl+Shift+C` (Windows/Linux) / `Command+Shift+C` (Mac) - Copy current tweet
- `Ctrl+Shift+T` (Windows/Linux) / `Command+Shift+T` (Mac) - Copy thread

## Development Workflow

### Setup & Development
1. **Install**: `pnpm install && pnpm postinstall`
2. **Development**: `pnpm dev` (loads extension in Chrome dev mode)
3. **Extension Location**: Load `.output/chrome-mv3-dev` in `chrome://extensions/`
4. **Testing**: Open `tests/test-runner.html` for comprehensive test suite
5. **Performance**: Use `tests/performance-runner.html` for performance analysis

### Code Organization Principles
- **Single Responsibility**: Each module has a clear, focused purpose
- **Dependency Direction**: Dependencies flow inward (UI → Business Logic → Utils)
- **Error Boundaries**: Each layer handles its own errors and provides fallbacks
- **TypeScript Strict**: Full type safety with strict mode enabled

### Testing Strategy
- **62 Test Suites**: Comprehensive test coverage across all modules
- **Mock System**: Built-in mocking for DOM, APIs, and browser features
- **Performance Tests**: Memory usage and execution time monitoring
- **Integration Tests**: End-to-end workflow testing

## Important Implementation Notes

### Current State
This is a **production-ready extension** with ~8,000+ lines of well-structured code. It's not a starter template but a fully-featured application with:
- Complete UI implementation
- Robust error handling
- Performance optimizations
- Comprehensive testing
- Multi-language support

### Critical Dependencies
- **@zumer/snapdom** (`^1.9.6`) - Screenshot functionality (dynamically loaded)
- **WXT** (`^0.20.6`) - Build framework
- **TypeScript** (`^5.8.3`) - Type checking

### Development Best Practices
- Content script logs appear in page console
- Background script logs in extension service worker console  
- Popup logs in popup dev tools (right-click popup → inspect)
- Use browser dev tools "Extension" tab for debugging
- Test with both twitter.com and x.com domains

### Architecture Decisions
- **No External Services**: Everything runs locally for privacy
- **Graceful Degradation**: Works even with limited API support
- **Memory Conscious**: Automatic cleanup and resource management
- **User Experience First**: Extensive error handling with helpful messages