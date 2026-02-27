<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-02-27 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and development patterns for chamalead_extension.
**Last Updated**: 2026-02-27

## Quick Reference
**Update Triggers**: Tech stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack
| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React | 19 | UI library with hooks |
| Build Tool | Vite | 7 | Fast bundling + HMR |
| Language | TypeScript | 5.x | Type safety |
| Extension | @crxjs/vite-plugin | - | Manifest V3 support |
| Linting | ESLint | 9 | Code quality |
| Polyfill | webextension-polyfill | - | Cross-browser API |

## Code Patterns
### Storage (src/shared/lib/storage.ts)
```typescript
import browser from 'webextension-polyfill'
const STORAGE_KEY = 'chamalead:settings'

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await browser.storage.sync.get(STORAGE_KEY)
  return { ...defaultSettings, ...(data[STORAGE_KEY] as Partial<ExtensionSettings>) }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: settings })
}
```

### Custom Hook (src/shared/hooks/useExtensionSettings.ts)
```typescript
export function useExtensionSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const loaded = await getSettings()
      setSettings(loaded)
      setIsLoading(false)
    })()
  }, [])

  const updateSettings = async (next: ExtensionSettings): Promise<void> => {
    setSettings(next)
    await saveSettings(next)
  }
  return { settings, isLoading, updateSettings }
}
```

### UI Component (src/components/ui/Button.tsx)
```typescript
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>

export function Button({ children, ...rest }: ButtonProps) {
  return <button {...rest} style={{ border: 'none', borderRadius: 8, padding: '8px 12px' }}>{children}</button>
}
```

## Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `PopupApp`, `SettingsForm`, `Card` |
| Hooks | prefix `use` | `useExtensionSettings`, `useStorage` |
| Types | PascalCase | `ExtensionSettings`, `ButtonProps` |
| Files (components) | PascalCase | `SettingsForm.tsx`, `Card.tsx` |
| Files (utilities) | kebab-case | `storage.ts`, `api-client.ts` |
| CSS Classes | kebab-case | `.settings-form`, `.submit-button` |

## Code Standards
- **TypeScript**: strict mode enabled, `verbatimModuleSyntax` requires explicit `type` keyword
- **Imports**: React imports first, then external libs, then internal, then types last
- **Error Handling**: Use try/catch for user feedback, `.catch()` for non-critical
- **Type Safety**: Prefer interfaces for objects, types for unions; avoid `any`, use `unknown`

## Security Requirements
- Validate all user input in forms
- Use Chrome Storage API via polyfill (not localStorage)
- No secrets in code; use extension storage for sensitive data

## 📂 Codebase References
| File | Purpose |
|------|---------|
| `src/shared/lib/storage.ts` | Storage layer using browser.storage.sync |
| `src/shared/hooks/useExtensionSettings.ts` | Settings state management hook |
| `src/components/ui/Button.tsx` | Base button component |
| `src/components/ui/Switch.tsx` | Toggle switch component |
| `src/components/ui/Card.tsx` | Card container component |
| `src/features/settings/SettingsForm.tsx` | Settings form with save functionality |
| `vite.config.ts` | Vite + CRXJS configuration |
| `eslint.config.js` | ESLint 9 flat config |

## Entry Points
| Page | Entry | Output |
|------|-------|--------|
| Popup | `src/popup/main.tsx` | `index.html` |
| Options | `src/options/main.tsx` | `options.html` |
| Background | `src/extension/background.ts` | Service Worker |
| Content Script | `src/extension/content.ts` | Injected script |

## Related Files
- AGENTS.md (root) - Build commands and development guidelines
