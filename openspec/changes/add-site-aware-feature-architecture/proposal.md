## Why

The extension currently assumes WhatsApp Web across the popup, background worker, and content-script integration, which makes future site-specific features risky to add and unclear to present when the active tab is not supported.

This change introduces a small site-aware foundation so ChamaLead can safely identify the active site, expose only compatible features, and show a clear unsupported-site state without changing existing WhatsApp behavior.

## What Changes

- Add a site context capability that resolves the active browser tab into a supported site definition or an unsupported-site state.
- Introduce a lightweight registry for site definitions and feature availability, starting with WhatsApp as the only supported site.
- Update the popup behavior conceptually so global tabs remain available while site-specific tabs are shown only for the detected supported site.
- Preserve the existing WhatsApp bulk-send flow, WPP status checks, content-script injection scope, and host permissions.
- Show a clear unsupported-site experience when the active tab is not a known supported site.
- Do not add Google Maps, Instagram, or other site features in this change.

## Capabilities

### New Capabilities
- `site-aware-feature-availability`: Resolves the active tab's site context and controls which popup features are available for supported and unsupported sites.

### Modified Capabilities
- None.

## Impact

- Affected areas: popup page composition, feature exports, active-tab/site detection logic, and the WhatsApp feature boundary.
- Existing WhatsApp content script and page bridge should remain scoped to `https://web.whatsapp.com/*`.
- No new runtime dependencies are expected.
- No manifest host permission expansion is expected for this base change.
