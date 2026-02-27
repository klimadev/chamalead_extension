# AGENTS.md - Development Guidelines for Chamalead Extension

## Project Overview

Browser Extension (Chrome/Edge/Brave/Opera with Manifest V3) built with:
- React 19 + TypeScript
- Vite 7 + @crxjs/vite-plugin
- ESLint 9
- webextension-polyfill

## Build/Lint/Test Commands

```bash
# Development - starts Vite dev server
npm run dev

# Production build - runs TypeScript compiler + Vite build
npm run build

# Type checking only
npm run typecheck

# Linting all files
npm run lint

# Preview production build
npm run preview
```

**Note:** No test framework is currently configured. If adding tests, use Vitest (React-compatible).

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
│   └── content.ts
├── features/            # Business modules by feature
│   └── settings/
├── popup/               # Popup entry point
├── options/             # Options page entry point
├── shared/
│   ├── hooks/           # Shared React hooks
│   ├── lib/             # Utilities (storage, api)
│   └── types/           # Shared TypeScript types
└── styles/              # Global CSS
```

## Entry Points

| Page | Entry | Output |
|------|-------|--------|
| Popup | `src/popup/main.tsx` | `index.html` |
| Options | `src/options/main.tsx` | `options.html` |
| Background | `src/extension/background.ts` | Service Worker |
| Content Script | `src/extension/content.ts` | Injected script |

## Browser Extension Specific

- Use `webextension-polyfill` for cross-browser compatibility
- Manifest V3 required
- Background script runs as service worker
- Use Chrome Storage API via polyfill: `browser.storage.local`

## ESLint Rules

Project uses ESLint 9 flat config with:
- TypeScript ESLint
- React Hooks ESLint
- React Refresh (Vite HMR)

Run `npm run lint` before committing.

## Before Committing

1. Run `npm run lint` - fix any errors
2. Run `npm run build` - ensure production build succeeds
3. Run `npm run typecheck` - verify TypeScript types

No test framework configured yet. If adding tests, prefer Vitest.
