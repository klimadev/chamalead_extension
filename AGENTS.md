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

# Linting
npm run lint
```

**IMPORTANT:** ALWAYS run `npm run build` after any code change. This is the validation step - if it passes, the code is valid. No exceptions.

**Note:** No test framework configured. If adding tests, use Vitest with `vitest run` for single test or `vitest` for watch mode.

## Popup Copy

- Keep popup-facing copy short, scannable, and action-oriented.
- Prefer titles, chips, and labels that fit a narrow popup without wrapping.
- Use concise retry/status text for Instagram and other site-specific flows.

## Versioning Pattern

**CRITICAL: ALWAYS increment version** in BOTH files when making ANY code changes:
1. `package.json` - `"version"` field
2. `vite.config.ts` - `VERSION` constant (this sets the manifest version)

**MANDATORY ORDER:** Increment version FIRST, then run `npm run build` to validate.

Version format: `0.1.x` (start from 0.1.0)

### Semantic Versioning Guidelines

Increment based on the type of change:

| Change Type | Increment | Example |
|------------|----------|---------|
| Bug fixes, refactorings, text changes, non-breaking changes | **Patch** (0.1.x → 0.1.x+1) | 0.1.31 → 0.1.32 |
| New features, new functionality | **Minor** (0.x.0 → 0.x+1.0) | 0.1.0 → 0.2.0 |
| Breaking changes, API changes | **Major** (x.0.0 → x+1.0.0) | 0.1.0 → 1.0.0 |

**IMPORTANT:** Version must be incremented BEFORE running `npm run build`. The build validates the new version is correct.

## Release Changelog Guidelines

When making user-visible changes, include meaningful changelog notes that will be used in GitHub Releases and displayed in the extension popup.

### CHANGELOG.md Convention

Maintain a `CHANGELOG.md` at the project root with entries for each version:

```markdown
# Changelog

## [0.1.33] - 2026-05-06
### Added
- New feature X

### Changed
- Improved Y

### Fixed
- Bug fix Z

## [0.1.32] - 2026-05-06
...
```

### Commit and PR Guidelines

- Write commit messages that describe user-visible changes clearly
- Include a changelog section in PR descriptions when user-visible changes are made
- Format: `Added/Changed/Fixed/Removed: <description>`

### GitHub Release Notes

The GitHub Actions workflow uses `generate_release_notes: true` which creates release notes automatically. To ensure quality:
- Write clear, user-facing commit messages
- Include a `CHANGELOG.md` entry for each release
- The popup displays `release.body` as the changelog, so ensure release notes are meaningful

## Build Validation Pipeline

**ALWAYS run this pipeline after any change:**
1. `npm run lint` - If this fails, fix errors
2. `npm run build` - If it passes, code is valid

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
3. Internal imports (prefer `@/` alias)
4. Type imports (last)

```typescript
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/ui'
import { type ExtensionSettings } from '@/features'
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
- Use proper types for Chrome extension APIs

## WPPConnect WA-JS Integration (CRITICAL)

### Correct API Method

**Always use:** `WPP.chat.sendTextMessage(chatId, message, options?)`

```javascript
// Simple text message
const result = await WPP.chat.sendTextMessage('5511999999999@c.us', 'Hello!')
console.log('Message ID:', result.id)

// With interactive buttons
await WPP.chat.sendTextMessage('5511999999999@c.us', 'Choose an option:', {
  useInteractiveMessage: true,
  buttons: [
    { url: 'https://example.com/', text: 'Visit Website' },
    { phoneNumber: '+5511999999999', text: 'Call Us' },
    { id: 'option_1', text: 'Option 1' }
  ]
})
```

### Context Isolation Problem

Chrome extension content scripts run in an **ISOLATED world** - SEPARATE from the page's JavaScript context (MAIN world).

- Content scripts CANNOT access `window.WPP` or `globalThis.WPP`
- Always use the **Page Bridge Pattern** to interact with WA-JS

### Page Bridge Pattern

**Communication Flow:**
```
Popup/Background → chrome.runtime.sendMessage → Content Script
  → window.postMessage → Page Bridge (MAIN world)
  → reads globalThis.WPP
  → window.postMessage → Content Script
  → chrome.runtime.sendResponse → Popup/Background
```

**Required Setup:**

1. **public/vendor/chamalead-page-bridge.js** - Bridge script in MAIN world:
   - Listens for `CHAMALEAD_PAGE_*` messages
   - Accesses `globalThis.WPP`
   - Responds via `window.postMessage`

2. **src/extension/content.ts** - Forward requests:
   - Inject bridge script
   - Use `window.postMessage` with `requestId` for correlation
   - Set timeout (2-3s) for failures

3. **vite.config.ts** - Add to web_accessible_resources:
   ```typescript
   web_accessible_resources: [
     { resources: ['vendor/wppconnect-wa.js', 'vendor/chamalead-page-bridge.js'],
       matches: ['https://web.whatsapp.com/*'] }
   ]
   ```

### Debugging

- **Content Script:** DevTools → web.whatsapp.com → Console (select "Content Script")
- **Page Bridge:** DevTools → web.whatsapp.com → Console (main world)
- **Service Worker:** chrome://extensions → ChamaLead → Service Worker
- Use `[ChamaLead]` prefix for all console logs

## Project Structure

```
src/
├── extension/         # Background service worker + content scripts
├── pages/             # Popup/Options entries
├── features/          # Business modules by feature
├── ui/                # Reusable UI components
└── styles/            # Global CSS

public/vendor/         # External scripts (wppconnect-wa.js, chamalead-page-bridge.js)
```

## Before Committing

1. Run `npm run lint` - Fix any lint errors
2. Run `npm run build` - Ensure build succeeds (REQUIRED)
3. Increment version in `package.json` AND `vite.config.ts` following the Semantic Versioning Guidelines (patch/minor/major)
4. After version increment, run `npm run build` again to validate the new version is correct
5. Commit and push with the incremented version
