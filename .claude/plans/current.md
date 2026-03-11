# nico_meets — Implementation Plan

## Context
nico_meets bridges Google Meet chat to nico_monitor (a Niconico-style scrolling comment overlay). Chat messages from a Meet call get POSTed to nico_monitor's `POST /comment` endpoint and appear as scrolling text on screen. This enables live audience feedback during presentations/meetings.

## Requirements Summary
- **Capture methods**: Console script first, then Chrome extension
- **Message format**: Text only (no sender name)
- **History**: New messages only (skip existing when activated)
- **Endpoint**: Configurable (default `localhost:29292`)
- **CORS**: Add CORS support to nico_monitor (prerequisite)

---

## Development Approach
- **TDD**: t-wada style strict Red-Green-Refactor — write one failing test, make it pass, refactor, repeat
- **Language**: TypeScript
- **Package manager**: pnpm
- **Build**: Bundle console script from TS source; extension built from same TS codebase

---

## Phase 0: Add CORS to nico_monitor

**Why**: Browser JS on `meet.google.com` cannot POST to `localhost` without CORS headers.

**File**: `/home/debian/Dev/nico_tools/nico_monitor/internal/input/http.go`

- Add CORS middleware wrapping the existing mux
- Allow `Origin: *` (local tool, no auth needed)
- Handle `OPTIONS` preflight with `Access-Control-Allow-Methods: POST` and `Access-Control-Allow-Headers: Content-Type`
- Add CORS headers to all responses

**Test**: Update `/home/debian/Dev/nico_tools/nico_monitor/internal/input/http_test.go` with CORS tests (preflight OPTIONS, response headers).

---

## Phase 1: Project Setup + Console Script

### Project setup
- `pnpm init` in nico_meets root
- Install dev deps: `typescript`, `vitest` (for TDD), `esbuild` (for bundling to single JS file)
- `tsconfig.json` targeting ES2020+ (browser environment)
- Build script: bundle `src/` → `dist/nico_meets.js` (self-contained IIFE for console)

### Source structure
```
src/
  bridge.ts             # NicoMeetsBridge class (core logic)
  bridge.test.ts        # TDD tests for bridge logic
  console.ts            # IIFE entry point for console script
  dom.ts                # DOM discovery and text extraction
  dom.test.ts           # TDD tests for DOM logic (with jsdom or mock DOM)
```

### Console script output
**Output**: `dist/nico_meets.js` — bundled IIFE

The bundled script:
1. **Config block at top** — `NICO_MEETS_HOST` and `NICO_MEETS_PORT` variables, easy to edit
2. **`findChatContainer()`** — Multi-strategy DOM discovery:
   - `[aria-live="polite"]` regions (accessibility landmark for chat)
   - `[data-message-id]` parent containers
   - Structural fallback near chat-related aria labels
3. **Snapshot existing messages** — Record all current message IDs/text hashes as "seen" before observing
4. **`MutationObserver`** on chat container — `childList: true, subtree: true`
5. **`extractText(node)`** — Get message text, skip sender name element (first child)
6. **Dedup** — By `data-message-id` (primary) and text content (fallback)
7. **`send(text)`** — `fetch POST` to nico_monitor, truncate to 255 chars (`[...text].slice(0, 255).join('')`)
8. **Error handling** — Console warnings only, throttle connection errors
9. **Expose `window.__nicoMeets`** — For manual `.stop()` control

**DOM note**: Google Meet uses dynamic class names. Selectors must rely on `aria-*`, `data-*`, and structural patterns. These may break on Meet updates — document the selector chain for easy maintenance.

---

## Phase 2: Chrome Extension (Manifest V3)

Extract core logic from the IIFE into a reusable module, then wrap in extension scaffolding.

### File structure
```
extension/
  manifest.json         # MV3, content_scripts for meet.google.com
  lib/bridge.js         # NicoMeetsBridge class (shared core logic)
  content.js            # Instantiates bridge, reads chrome.storage, listens for popup messages
  popup.html            # Config UI (host, port, enable/disable toggle)
  popup.js              # Saves to chrome.storage.sync, sends message to content script
  popup.css
  icons/                # Placeholder icons
```

### manifest.json key points
- `permissions`: `["storage", "activeTab"]`
- `host_permissions`: `["http://localhost/*"]` (bypasses CORS for content script fetch)
- `content_scripts`: match `https://meet.google.com/*`, run at `document_idle`

### content.js behavior
- Read config from `chrome.storage.sync`
- Watch for chat panel appearance with a body-level MutationObserver
- When chat panel found, instantiate `NicoMeetsBridge` and start
- Listen for `chrome.runtime.onMessage` for toggle/config updates from popup

---

## Implementation Order

1. Add CORS middleware to nico_monitor (separate PR in nico_monitor repo)
2. `pnpm init`, install deps, configure `tsconfig.json` and build scripts
3. TDD: `bridge.ts` — write failing test for `send()`, make it pass, refactor. Repeat for dedup, truncation.
4. TDD: `dom.ts` — write failing tests for `findChatContainer()`, `extractText()` with mock DOM
5. Create `console.ts` entry point, configure esbuild to bundle → `dist/nico_meets.js`
6. Test against live Google Meet (adjust selectors as needed)
7. Update `README.md` with console script usage
8. Extract/reuse `bridge.ts` and `dom.ts` for extension `content.js`
9. Create extension `manifest.json`, `content.ts`, `popup.html/ts/css`
10. Add placeholder icons
11. Test extension via "Load unpacked" in Chrome
12. Update `README.md` with extension install instructions (load unpacked — no marketplace publishing)

---

## Verification

1. **CORS**: `curl -X OPTIONS http://localhost:29292/comment -H "Origin: https://meet.google.com" -v` — should return CORS headers
2. **Console script**: Start nico_monitor, join a Meet call, open chat, paste script, send messages from another participant — messages should scroll on overlay
3. **Extension**: Load unpacked, join Meet, open chat — messages should auto-forward without DevTools
4. **Edge cases**: nico_monitor not running (console warning, no crash), long messages (truncated), rapid messages (no duplicates)
