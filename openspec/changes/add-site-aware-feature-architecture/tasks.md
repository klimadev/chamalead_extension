## 1. Site context foundation

- [x] 1.1 Add site context types and a small site registry for supported and unsupported sites
- [x] 1.2 Add active-tab site detection logic that resolves the current tab into a site context
- [x] 1.3 Add a hook or utility for popup code to consume the resolved site context

## 2. Popup composition

- [x] 2.1 Refactor the popup to separate global tabs from site-specific tabs
- [x] 2.2 Render WhatsApp-specific content only when the resolved site context is WhatsApp
- [x] 2.3 Add a clear unsupported-site state while keeping updates and about available

## 3. WhatsApp boundary preservation

- [x] 3.1 Keep the existing WhatsApp content-script and manifest scope unchanged for this base change
- [x] 3.2 Ensure WhatsApp bulk-send and status behavior still work when the active site context is WhatsApp
- [x] 3.3 Remove any remaining popup assumptions that the extension is always running on WhatsApp

## 4. Validation

- [x] 4.1 Verify the new site-aware flow matches the spec scenarios
- [x] 4.2 Run lint and production build after implementation
