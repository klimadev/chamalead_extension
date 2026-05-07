## Why

ChamaLead already has a site-aware popup foundation, but Instagram is still treated as an unsupported site. Adding a first Instagram capability lets the extension show useful lead context from the profile currently open in the active tab without introducing automation or broad scraping flows.

## What Changes

- Use the provided console script as the reference flow for the first version, including SSR/session extraction, GraphQL request construction, and the returned `data.user` shape.
- Add Instagram as a supported site in the site registry for `https://www.instagram.com/*`.
- Add an Instagram-specific popup tab that displays details for the profile currently open in the active Instagram tab.
- Add an Instagram page-context query flow that extracts SSR/session values from the current page and requests the existing Instagram profile GraphQL document.
- Display a concise profile summary including identity, profile image, biography, links, public metrics, business/verification/privacy indicators, linked Facebook page when available, and viewer friendship status when available.
- Treat the returned `data.user` payload as the interpretation contract for the UI, so the popup maps those fields into a readable profile summary instead of exposing raw GraphQL output.
- Keep the current `doc_id` fixed for now so the first implementation can focus on page integration and data presentation.
- Show clear empty/error states when the active Instagram page is not a profile page, required tokens cannot be found, the user is not authenticated, or the GraphQL response fails.
- Keep this change read-only: no follow/unfollow, messaging, scraping queues, persistence of Instagram tokens, or background harvesting.

## Capabilities

### New Capabilities
- `instagram-profile-details`: Resolves and displays read-only details for the Instagram profile currently open in the active tab.

### Modified Capabilities
- None.

## Impact

- Affected areas: site-context registry, popup tab composition, Instagram feature module, manifest host permissions/content script wiring, and extension-page messaging.
- Adds Instagram host access for `https://www.instagram.com/*` and a site-specific content script or bridge path.
- No new runtime dependencies are expected.
- No data migration is required because the feature is read-only and should not persist Instagram tokens or profile snapshots.
