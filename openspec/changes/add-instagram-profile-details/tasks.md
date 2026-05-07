## 1. Site context and manifest wiring

- [x] 1.1 Extend site-context types to support an `instagram` site and a profile-details feature tab
- [x] 1.2 Add Instagram URL matching for `https://www.instagram.com/*` while preserving WhatsApp behavior
- [x] 1.3 Update popup tab metadata so Instagram exposes a profile tab and unsupported sites expose no site-specific tabs
- [x] 1.4 Add Instagram host permission and content-script wiring without causing WhatsApp WA-JS injection to run on Instagram

## 2. Instagram page query flow

- [x] 2.1 Create Instagram-specific message names and response types for profile consultation
- [x] 2.2 Add a site-specific Instagram content-script path or strict URL-gated branch for Instagram only
- [x] 2.3 Add an Instagram page bridge that runs in page context and follows the provided console reference flow for extracting `actorID`/`NON_FACEBOOK_USER_ID`, `profile_id`/`id`/`pk`, `csrf`, `lsd`, `fb_dtsg`, and `appId` from the current page
- [x] 2.4 Implement the read-only Instagram GraphQL profile request using the current page session, the reference `variables` payload, and the fixed initial `doc_id`
- [x] 2.5 Normalize successful `data.user` responses into the UI contract for profile details so the popup interprets the returned fields instead of raw GraphQL output
- [x] 2.6 Return typed error states for non-profile pages, missing tokens, unauthenticated/session failures, GraphQL errors, and network/runtime failures
- [x] 2.7 Ensure raw tokens and raw GraphQL payloads are not persisted or printed in diagnostic logs

## 3. React feature module

- [x] 3.1 Add an Instagram feature module with profile detail types and a hook for querying the active Instagram tab
- [x] 3.2 Build the Instagram profile details UI with loading, success, empty, and error states
- [x] 3.3 Display identity, profile image, biography, links, public metrics, account flags, linked Facebook page, and friendship status when available
- [x] 3.4 Add a manual retry action for failed or stale profile consultations
- [x] 3.5 Export Instagram feature APIs from the feature barrel without breaking existing WhatsApp exports

## 4. Popup integration

- [x] 4.1 Render an Instagram-specific status/header panel when the active site is Instagram
- [x] 4.2 Render the Instagram profile tab only when the active site context is Instagram
- [x] 4.3 Keep WhatsApp bulk-send rendering gated to WhatsApp only
- [x] 4.4 Keep Updates and About global tabs available across Instagram, WhatsApp, and unsupported sites

## 5. Validation

- [ ] 5.1 Manually inspect the unsupported-site, Instagram non-profile, Instagram missing-session, and successful profile states
- [x] 5.2 Run `npm run lint` and fix any reported issues
- [x] 5.3 Increment the extension version in `package.json` and `vite.config.ts` before build validation
- [x] 5.4 Run `npm run build` and fix any reported issues
- [x] 5.5 Add a `CHANGELOG.md` entry for the user-visible Instagram profile feature
