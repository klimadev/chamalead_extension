# AGENTS.md - Development Guidelines for Chamalead Extension

## Project Overview

Browser Extension (Chrome/Edge/Brave/Opera with Manifest V3) built with:
- React 19 + TypeScript
- Vite 7 + @crxjs/vite-plugin
- ESLint 9
- webextension-polyfill
- WPPConnect WA-JS (v3.22.0) for WhatsApp Web automation

## Build/Lint/Test Commands

```bash
# Production build - runs TypeScript compiler + Vite build (ALWAYS RUN THIS)
npm run build

# Type checking only
npm run typecheck

# Development server (NOT for extension testing)
npm run dev

# Preview production build
npm run preview

# Linting (ALWAYS run after build)
npm run lint
```

**IMPORTANT:** ALWAYS run `npm run build` after any code change. This is the validation step - if it passes, the code is valid. No exceptions.

**Note:** No test framework configured. If adding tests, use Vitest.

## Versioning Pattern

**CRITICAL: ALWAYS increment version** in BOTH files when making ANY code changes:
1. `package.json` - `"version"` field
2. `vite.config.ts` - `VERSION` constant

Version format: `0.1.x` (start from 0.1.0)

Example:
- Current: 0.1.5
- After change: 0.1.6

## Build Validation

**ALWAYS run this pipeline after any change:**
1. `npm run lint` - If this fails, fix errors
2. `npm run build` - If this passes, code is valid

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode enabled** - All strict checks must pass
- **verbatimModuleSyntax** - Use explicit `type` keyword for type-only imports

```typescript
import { useState } from 'react'
import { type FC, type ReactNode } from 'react'
import { type Settings } from '../types'
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `PopupApp`, `SettingsForm` |
| Hooks | prefix `use` | `useExtensionSettings` |
| Types/Interfaces | PascalCase | `ExtensionSettings` |
| Files (components) | PascalCase | `SettingsForm.tsx` |
| Files (utilities) | kebab-case | `storage.ts` |
| CSS Classes | kebab-case | `.settings-form` |

### Import Order

1. React imports
2. External libraries
3. Internal imports (relative paths)
4. Type imports (last)

```typescript
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { type Settings } from '../shared/types/settings'
```

### Error Handling

Use async/await with try/catch when user feedback is needed:

```typescript
const handleSave = async () => {
  try {
    await saveSettings(settings)
    showSuccess('Settings saved')
  } catch (error) {
    showError('Failed to save settings')
  }
}
```

### Type Safety

- Prefer interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` when type is truly unknown

## WPPConnect WA-JS Integration

### CRITICAL: Context Isolation Problem

Chrome extension content scripts run in an **ISOLATED world** by default, which is SEPARATE from the page's JavaScript context (MAIN world).

- Content scripts CANNOT access `window.WPP` or `globalThis.WPP`
- The WA-JS library is loaded in the MAIN world (page context)
- Console DevTools shows `WPP.isReady` working because you're in the MAIN world

### Solution: Page Bridge Pattern

**ALWAYS use the page bridge pattern to access WPP:**

1. **Content Script** (ISOLATED world):
   - Injects bridge script into page
   - Sends request via `window.postMessage`
   - Receives response via `window.addEventListener('message')`
   - Uses `chrome.runtime.onMessage` to communicate with popup/background

2. **Page Bridge Script** (MAIN world):
   - Runs in page context (reads `globalThis.WPP`)
   - Listens for `CHAMALEAD_PAGE_GET_WPP_STATUS` messages
   - Responds via `window.postMessage` with `CHAMALEAD_PAGE_WPP_STATUS`

3. **Communication Flow:**
   ```
   Popup/Background → chrome.runtime.sendMessage → Content Script
   → window.postMessage → Page Bridge (MAIN world)
   → reads globalThis.WPP
   → window.postMessage → Content Script
   → chrome.runtime.sendResponse → Popup/Background
   ```

### Required Setup

1. **vite.config.ts** - Add bridge to web_accessible_resources:
   ```typescript
   web_accessible_resources: [
     {
       resources: ['vendor/wppconnect-wa.js', 'vendor/chamalead-page-bridge.js'],
       matches: ['https://web.whatsapp.com/*'],
     },
   ],
   ```

2. **content.ts** - Inject bridge + forward requests:
   - Inject `vendor/chamalead-page-bridge.js`
   - Use `window.postMessage` with `requestId` for correlation
   - Set timeout (2-3s) to handle failures gracefully

3. **vendor/chamalead-page-bridge.js** - Bridge script in MAIN world:
   ```javascript
   (() => {
     const REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
     const RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'

     window.addEventListener('message', (event) => {
       if (event.source !== window) return
       if (event.data.type !== REQUEST_TYPE) return

       const wpp = globalThis.WPP
       // ... read WPP status

       window.postMessage({
         type: RESPONSE_TYPE,
         requestId: event.data.requestId,
         isReady: ...,
         isAuthenticated: ...,
       }, '*')
     })
   })()
   ```

### Debugging WPP Issues

- **Content Script:** Open DevTools on `web.whatsapp.com` → Console (use dropdown to select content script context)
- **Page Bridge:** Open DevTools on `web.whatsapp.com` → Console (main world)
- **Service Worker:** `chrome://extensions` → ChamaLead → Service Worker → Console
- Use `[ChamaLead]` prefix for all console logs

### Checking WPP Status

```javascript
// In page bridge (MAIN world)
const wpp = globalThis.WPP
const isReady = wpp?.isReady === true
const isAuthenticated = wpp?.conn?.isAuthenticated?.() === true
```

## Project Structure

```
src/
├── app/               # Popup/Options UI composition
├── components/ui/    # Reusable UI components
├── extension/        # Background service worker + content scripts
├── features/         # Business modules by feature
├── popup/            # Popup entry point
├── options/          # Options page entry point
├── shared/           # Hooks, lib, types
├── styles/           # Global CSS
└── vendor/           # External scripts (wppconnect-wa.js, chamalead-page-bridge.js)
```

## Entry Points

| Page | Entry | Output |
|------|-------|--------|
| Popup | `src/popup/main.tsx` | `index.html` |
| Options | `src/options/main.tsx` | `options.html` |
| Background | `src/extension/background.ts` | Service Worker |
| Content Script | `src/extension/content.ts` | Injected script |

## Browser Extension Specific

### Manifest V3

- Use `webextension-polyfill` for cross-browser compatibility
- Use Chrome Storage API via polyfill: `browser.storage.local`

### WA-JS Injection

- Injected via static content script in `vite.config.ts`
- Runs on `https://web.whatsapp.com/*`
- Retry logic: 3 attempts with 2s delay if WPP not available
- Debug logs: `[ChamaLead]` prefix in console

## Before Committing

1. Run `npm run lint` - Fix any lint errors
2. Run `npm run build` - Ensure build succeeds (REQUIRED)
3. Verify TypeScript types in your editor (LSP)
4. Increment version in `package.json` AND `vite.config.ts`
