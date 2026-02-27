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
# Development - starts Vite dev server (NOT for extension testing)
npm run dev

# Production build - runs TypeScript compiler + Vite build
npm run build

# Type checking only
npm run typecheck

# Linting all files (OPTIONAL - only run if LSP shows no errors)
npm run lint

# Preview production build
npm run preview
```

**Note:** No test framework is currently configured. If adding tests, use Vitest.

## Versioning Pattern

**ALWAYS increment version** in both files when making code changes:
1. `package.json` - `"version"` field
2. `vite.config.ts` - `VERSION` constant

Version format: `0.1.x` (start from 0.1.0)

Example:
```bash
# Update version in both files to 0.1.3
```

## Build Validation

**Run in this order:**
1. `npm run build` - if it passes, the code is valid
2. If build fails, check TypeScript errors in your editor (LSP)

**Lint is optional** - only run `npm run lint` if your editor/LSP doesn't already show errors. The build process includes type checking which is sufficient.

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode enabled** - All strict checks must pass
- **verbatimModuleSyntax** - Use explicit `type` keyword for type-only imports:
  ```typescript
  import { type FC, type ReactNode } from 'react'
  import { useState } from 'react'
  import { type Settings } from '../types'
  ```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `PopupApp`, `SettingsForm`, `Card` |
| Hooks | prefix `use` | `useExtensionSettings`, `useStorage` |
| Types/Interfaces | PascalCase | `ExtensionSettings`, `ButtonProps` |
| Files (components) | PascalCase | `SettingsForm.tsx`, `Card.tsx` |
| Files (utilities) | kebab-case | `storage.ts`, `api-client.ts` |
| CSS Classes | kebab-case | `.settings-form`, `.submit-button` |

### Import Order

1. React/React Native imports
2. External libraries
3. Internal imports (relative paths)
4. Type imports (last)

```typescript
import { useState, type FC, type ReactNode } from 'react'
import { motion } from 'framer-motion'

import { Card } from '../components/ui/Card'
import { type Settings } from '../shared/types/settings'
```

### Component Structure

```typescript
import { type FC } from 'react'
import { type ButtonProps } from './Button.types'

export const Button: FC<ButtonProps> = ({ 
  children, 
  onClick,
  variant = 'primary' 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

### Error Handling

- Use async/await with proper error handling
- Wrap async operations in try/catch when user feedback is needed
- Use TypeScript types for error states

```typescript
// Good: with error feedback
const handleSave = async () => {
  try {
    await saveSettings(settings)
    showSuccess('Settings saved')
  } catch (error) {
    showError('Failed to save settings')
  }
}

// Good: for non-critical operations
const data = await fetchData().catch(() => defaultValue)
```

### CSS/Styling

- Use CSS modules or global CSS with kebab-case classes
- Avoid inline styles except for dynamic values
- Follow existing patterns in `src/styles/global.css`

### Type Safety

- Prefer interfaces for object shapes, types for unions/primitives
- Use `type` keyword for type-only imports
- Avoid `any` - use `unknown` when type is truly unknown

## Project Structure

```
src/
├── app/
│   ├── popup/           # Popup UI composition
│   └── options/         # Options page UI composition
├── components/
│   └── ui/              # Reusable base UI components
├── extension/           # Background service worker + content scripts
│   ├── background.ts
│   └── content.ts       # WA-JS injection logic
├── features/            # Business modules by feature
│   └── settings/
├── popup/               # Popup entry point
├── options/             # Options page entry point
├── shared/
│   ├── hooks/           # Shared React hooks
│   ├── lib/             # Utilities (storage, api)
│   └── types/           # Shared TypeScript types
├── styles/              # Global CSS
└── vendor/              # External scripts (wppconnect-wa.js)
```

## Entry Points

| Page | Entry | Output |
|------|-------|--------|
| Popup | `src/popup/main.tsx` | `index.html` |
| Options | `src/options/main.tsx` | `options.html` |
| Background | `src/extension/background.ts` | Service Worker |
| Content Script | `src/extension/content.ts` | Injected script |

## Browser Extension Specific

### Manifest V3 Configuration

- Use `webextension-polyfill` for cross-browser compatibility
- Background script runs as service worker (not persistent)
- Use Chrome Storage API via polyfill: `browser.storage.local`

### Content Script Injection (WPPConnect WA-JS)

The extension injects `wppconnect-wa.js` (v3.22.0) into WhatsApp Web:

1. **Static content script** in `vite.config.ts` - runs on `https://web.whatsapp.com/*`
2. **Injection happens after page full load** (`window.load` event)
3. **Retry logic**: up to 3 attempts with 2s delay if WPP global not available
4. **Navigation observer**: re-injects on SPA navigation

Key files:
- `src/extension/content.ts` - injection logic
- `public/vendor/wppconnect-wa.js` - WPPConnect library (v3.22.0)

Debug logs look for: `[ChamaLead]` prefix in console

### web_accessible_resources

For the injected script to work, resources must be declared in `vite.config.ts`:
```typescript
web_accessible_resources: [
  {
    resources: ['vendor/wppconnect-wa.js'],
    matches: ['https://web.whatsapp.com/*'],
  },
],
```

### Required Permissions

- `storage` - for extension settings
- `tabs` - for tab operations
- `scripting` - for programmatic script injection (if needed)
- `host_permissions` - `https://web.whatsapp.com/*`

## Debugging Content Scripts

1. Open `web.whatsapp.com`
2. Open DevTools (F12) **on the page** (not extension DevTools!)
3. Look for `[ChamaLead]` logs in Console

For background/service worker logs:
1. Go to `chrome://extensions`
2. Find ChamaLead Extension
3. Click "Service Worker" → check Console

## Before Committing

1. Run `npm run build` - ensure production build succeeds
2. Verify TypeScript types in your editor (LSP)
3. Increment version in `package.json` AND `vite.config.ts`
4. (Optional) Run `npm run lint` only if LSP shows errors

No test framework configured yet. If adding tests, prefer Vitest.
