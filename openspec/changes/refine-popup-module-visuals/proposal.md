## Why

The update module has already been visually refined into a clearer state-driven experience, but the remaining popup and options modules still feel mostly utilitarian. Bringing the rest of the extension to the same level will make ChamaLead feel like a cohesive operational tool rather than a collection of plain forms.

## What Changes

- Refine the bulk send module into a compact campaign cockpit with clearer preparation, content, safety, execution, and feedback areas.
- Improve the WhatsApp status/header area so readiness is visible immediately and communicates what is blocking use when unavailable.
- Refresh the About module so it reinforces product identity, capabilities, version context, and update/maintenance confidence.
- Improve the Options/Settings surface so preferences feel consistent with the popup visual language.
- Establish reusable visual patterns for state cards, module sections, campaign metadata, validation feedback, and operational logs.
- Preserve the existing behavior, message-sending flow, update flow, settings persistence, and extension permissions unless implementation discovers a concrete need.

## Capabilities

### New Capabilities
- `popup-module-visual-system`: Defines the visual and interaction requirements for refined popup/options modules, including the campaign cockpit, readiness status, About identity, settings surface, and responsive behavior.

### Modified Capabilities

## Impact

- Affected UI code: `src/pages/popup/PopupPage.tsx`, `src/pages/popup/UpdatesTab.tsx` only if shared styling alignment is needed, `src/features/whatsapp/BulkSendForm.tsx`, `src/features/settings/SettingsForm.tsx`, `src/pages/options/OptionsPage.tsx`, and reusable UI components in `src/ui/` if necessary.
- Affected styling: `src/styles/global.css`, with an emphasis on consolidating visual language rather than adding isolated one-off styles.
- No expected changes to WA-JS bridge behavior, background service worker behavior, GitHub update fetching, storage shape, or extension permissions.
- Versioning and validation requirements still apply during implementation: increment `package.json` and `vite.config.ts`, then run lint and build.
