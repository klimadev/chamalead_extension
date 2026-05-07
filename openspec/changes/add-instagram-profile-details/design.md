## Context

ChamaLead currently has a site-aware popup foundation, but only WhatsApp is a supported operational site. The existing content script is WhatsApp-specific: it injects WA-JS, installs a WhatsApp page bridge, and handles WPP status, chat, message, and audio requests.

Instagram profile data can be queried from the currently open profile page by reading SSR/session values from the page HTML and calling Instagram's internal GraphQL endpoint with the profile query document. The proof-of-concept works from the browser console because it runs in the page context and uses the user's authenticated Instagram session.

The user's reference script is the starting point for the implementation contract: it reads `document.documentElement.innerHTML`, extracts `av` from `actorID` or `NON_FACEBOOK_USER_ID`, extracts `profileId` from `profile_id`/`id`/`pk`, extracts `csrf`, `lsd`, `fb_dtsg`, and `appId`, builds the `variables` payload with the `Polaris...` flags, and posts to `https://www.instagram.com/graphql/query` with a fixed `doc_id` of `27077551658551360`.

This feature should be the first real expansion of the site-aware architecture while staying read-only and avoiding broader automation.

## Goals / Non-Goals

**Goals:**
- Recognize `https://www.instagram.com/*` as a supported site.
- Add a popup experience for the Instagram profile currently open in the active tab.
- Query profile details using the page's current authenticated context.
- Keep Instagram implementation isolated from WhatsApp WA-JS integration.
- Provide clear loading, unsupported-page, token-missing, unauthenticated, GraphQL-error, and network-error states.
- Avoid persisting Instagram tokens or profile snapshots.

**Non-Goals:**
- Do not automate Instagram actions such as follow, unfollow, like, comment, DM, or scraping queues.
- Do not add background harvesting across multiple profiles.
- Do not build a stable public Instagram API abstraction; the query relies on page/session internals.
- Do not refactor the full WhatsApp bulk-send engine beyond what is needed to keep content-script boundaries safe.

## Decisions

### Add Instagram as a Site Definition With a Profile Feature Tab

Extend the existing site registry to include an `instagram` supported site whose feature tabs expose a profile-details tab. This keeps popup composition consistent with the current site-aware model: global tabs remain available everywhere, while site-specific tabs are tied to the active site.

Alternative considered: render Instagram UI from ad hoc URL checks in `PopupPage`. That would be faster but would bypass the registry seam created specifically for multi-site expansion.

### Use an Instagram-Specific Content/Bridge Path

Instagram should not reuse the current WhatsApp content script behavior as-is because that script injects WA-JS and the WhatsApp page bridge on load. The implementation should either split content scripts by site or add an explicit URL-gated entry path so WhatsApp injection never runs on Instagram.

Preferred shape:

```
Popup
  └─ chrome.tabs.sendMessage(CHAMALEAD_GET_INSTAGRAM_PROFILE)
      └─ Instagram content script
          └─ window.postMessage(CHAMALEAD_PAGE_GET_INSTAGRAM_PROFILE)
              └─ Instagram page bridge
                  ├─ extracts SSR/session values
                  ├─ calls /graphql/query
                  └─ returns normalized profile data or typed error
```

Alternative considered: perform the fetch directly in the isolated content script. This may work in some cases, but the console proof-of-concept depends on page-context behavior and page-visible SSR values. A page bridge better matches the known working context and mirrors the project's existing WhatsApp isolation pattern.

### Normalize Profile Data Before Rendering

The bridge or content layer should return a small normalized profile object instead of exposing the entire GraphQL response to React UI. The UI should interpret the returned `data.user` fields as the source contract and map them into a readable summary with identity, biography, links, metrics, account flags, linked Facebook page, and friendship status.

Alternative considered: store/render the raw `data.user` object directly. That would accelerate the first screen but couples UI to an unstable internal Instagram response shape and makes error handling harder.

### Treat Instagram Query as Opportunistic and Read-Only

The `doc_id` and variables are Instagram internals and may change without notice, but for this initial change the `doc_id` is intentionally fixed to the reference script value so the work can stay focused on page integration and UI mapping. The product should present this as current-page profile insight, not as a durable integration. Failures should be visible and recoverable, with a manual retry path.

Alternative considered: poll continuously while the popup is open. This would increase request volume and fragility without much value for a profile details card.

### Keep Token Handling Ephemeral

The feature must extract CSRF/LSD/DTSG/App ID values only for the immediate request and must not store them in `chrome.storage`, logs, or UI. Diagnostic logs should avoid printing raw tokens.

Alternative considered: cache tokens for later requests. That increases security risk and is unnecessary for a popup-only current-page query.

## Risks / Trade-offs

- Instagram internal `doc_id` or variable names change -> Surface a typed GraphQL/query error and keep the implementation localized so the document can be updated later.
- Active tab is not a profile page -> Show an actionable empty state telling the user to open an Instagram profile.
- User is logged out or session tokens are unavailable -> Show an authentication/token state instead of a generic failure.
- Content script boundary becomes messy as more sites are added -> Prefer separate site-specific content script entry points or strict URL gating.
- New Instagram host permission is user-visible -> Keep the feature clearly scoped to `https://www.instagram.com/*` and document that it is read-only.
- Raw response contains more data than the UI needs -> Normalize and discard unneeded fields before returning to the popup.

## Migration Plan

1. Extend site context types and registry to include Instagram and a profile-details feature tab.
2. Add Instagram manifest host/content-script wiring while preserving WhatsApp matches and behavior.
3. Add the Instagram page bridge/query flow and normalized response type.
4. Add a React feature module and popup rendering path for the Instagram profile tab.
5. Validate unsupported-page and error states manually on Instagram and run the project's lint/build pipeline.

Rollback is straightforward: remove the Instagram site definition, tab, content-script/bridge wiring, and host permission. No persisted data migration is required.

## Open Questions

- Should the first UI display only a compact summary, or also expose expandable raw/debug fields for development builds?
- Should the query run automatically when the popup opens, or require a "Consultar perfil" button to reduce request volume?
- Should profile details refresh when the Instagram SPA route changes while the popup is open, or only when the user reopens/retries?
