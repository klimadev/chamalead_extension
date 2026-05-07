## Context

ChamaLead is currently implemented as a WhatsApp-focused browser extension. The manifest only grants and injects content scripts for `https://web.whatsapp.com/*`, the popup imports WhatsApp components directly, and the background worker contains WhatsApp-specific tab lookup and bulk-send orchestration.

That works for the current product, but it makes future site-specific expansion fragile because the popup has no explicit concept of the active site or of feature availability by site. Opening the popup on another site currently still presents WhatsApp-oriented language and actions instead of a clear unsupported-site state.

The base change should introduce a small architectural seam without broad rewrites: identify the active tab, map it to a site definition, and use that context to decide which tabs/features are visible.

## Goals / Non-Goals

**Goals:**
- Add a lightweight site registry that can identify WhatsApp Web and unsupported sites.
- Add an active-site context flow for popup rendering.
- Separate global popup tabs from site-specific popup tabs.
- Keep WhatsApp as the only supported operational site in this change.
- Preserve existing WhatsApp bulk-send behavior and content-script scope.
- Make future Google Maps, Instagram, or other adapters easier to add without changing the popup's core structure again.

**Non-Goals:**
- Do not implement Google Maps, Instagram, or any new site feature.
- Do not expand manifest host permissions beyond the existing WhatsApp scope.
- Do not introduce optional permissions yet.
- Do not rewrite the WhatsApp bridge, WA-JS integration, or bulk-send engine.
- Do not create a plugin framework or dynamic module loading system.

## Decisions

### Use a Small Site Registry Instead of Hard-Coded Popup Branches

Create a central registry with site definitions such as `whatsapp` and `unsupported`. Each supported definition owns URL matching metadata and display labels. The popup resolves the active tab URL through this registry instead of checking WhatsApp inline.

Alternative considered: keep URL checks inside `PopupPage`. That would be faster for the first change but would recreate the same coupling when adding the next site.

### Keep Feature Availability Static for Now

Represent feature availability as static metadata keyed by site context. For the initial change, WhatsApp exposes the existing bulk-send feature and unsupported sites expose no site-specific features.

Alternative considered: build a full adapter interface with lifecycle hooks, permissions, content scripts, and status probes. That is likely over-engineered before the second real site exists.

### Preserve WhatsApp Runtime Integration As-Is

The existing WhatsApp content script, page bridge, WPP status hook, and background bulk-send messages should remain behaviorally unchanged. The architectural change should wrap or route popup visibility, not move WA-JS logic yet.

Alternative considered: move WhatsApp content/background logic behind a complete adapter. That may be useful later, but doing it now increases regression risk without enabling a new user-visible capability.

### Make Unsupported Sites a First-Class State

Unsupported sites should be represented explicitly rather than as a missing/null state. This lets the popup show a stable, user-friendly message and continue exposing global tabs like updates and about.

Alternative considered: hide all content when no supported site is found. That makes the extension feel broken and gives no guidance.

## Risks / Trade-offs

- Popup state may momentarily show a loading or unsupported state while active-tab detection resolves -> Keep the state explicit and avoid enabling site actions until the context is known.
- A minimal registry may need adjustment when the second site arrives -> Keep the types narrow but extensible, avoiding premature hooks.
- Direct WhatsApp imports may still exist in popup composition -> Limit them to WhatsApp-specific rendering paths so unsupported sites do not trigger WhatsApp operational UI.
- Active-tab URL access depends on existing `tabs` permission -> The project already has this permission, so no new permission prompt is expected.

## Migration Plan

1. Add the site context types, registry, and active-site detection hook.
2. Refactor popup composition to render global tabs independently from site-specific tabs.
3. Gate the WhatsApp bulk-send tab behind the WhatsApp site context.
4. Add the unsupported-site empty state.
5. Validate with lint and production build.

Rollback is straightforward: revert the popup refactor and new site-context module. No data migration is required.

## Open Questions

- Should future site additions use optional permissions, fixed host permissions, or a hybrid model?
- Should future site adapters own content-script registration metadata, or should manifest wiring remain explicit per site?
- Should global tabs always be visible, or should some global tabs be hidden on unsupported/restricted pages?
