## 1. Visual Foundation

- [x] 1.1 Review existing popup/options styles and identify reusable visual primitives already used by `UpdatesTab`.
- [x] 1.2 Add or refine shared CSS classes for module cards, section headers, state panels, action groups, form controls, metadata chips, and operational feedback.
- [x] 1.3 Reduce relevant inline styles in reusable UI components only where it improves consistency without broad rewrites.

## 2. Popup Readiness And Navigation

- [x] 2.1 Refine the popup header into an operational WhatsApp readiness panel for ready, unauthenticated, and loading states.
- [x] 2.2 Keep the tab navigation compact and visually aligned with the refined module surfaces.
- [x] 2.3 Verify the existing blocked-state message still prevents bulk sending when WhatsApp is unavailable.

## 3. Bulk Send Campaign Cockpit

- [x] 3.1 Reorganize `BulkSendForm` markup into campaign regions for type, contact source, content, safety, actions, progress, and logs without changing handlers or state behavior.
- [x] 3.2 Refine the text/audio mode selector so both campaign types feel intentional and remain disabled during sending when required.
- [x] 3.3 Refine CSV import feedback with distinct visual treatment for detected columns, preview numbers, invalid count, and confirm import action.
- [x] 3.4 Refine text message and audio upload sections with consistent labels, hints, input styling, and uploaded audio presentation.
- [x] 3.5 Refine campaign action states for start, pause, resume, cancel, completion, and reset while preserving the existing button logic.
- [x] 3.6 Refine progress and logs so sent/failed/current/completed states are visible without overwhelming the form.

## 4. About And Options Surfaces

- [x] 4.1 Refresh the About tab with product identity, version, capabilities, and maintenance/update context using the shared visual system.
- [x] 4.2 Refresh `OptionsPage` and `SettingsForm` so preferences use the same cards, controls, labels, and helper text patterns as the popup.
- [x] 4.3 Preserve settings loading, draft editing, switch behavior, and save behavior exactly.

## 5. Responsive And Accessibility Checks

- [x] 5.1 Verify narrow popup behavior for status, campaign sections, action groups, changelog/update content, and logs without horizontal overflow.
- [x] 5.2 Verify semantic labels, status/alert regions, button labels, and form labels remain clear after markup changes.
- [x] 5.3 Check that visual status colors are accompanied by text and are not the only way to understand readiness, errors, or success.

## 6. Release And Validation

- [x] 6.1 Increment version in both `package.json` and `vite.config.ts` before validation.
- [x] 6.2 Add a `CHANGELOG.md` entry for the visual refinement if a changelog file exists or is being maintained for releases.
- [x] 6.3 Run `npm run lint` and fix any issues.
- [x] 6.4 Run `npm run build` and fix any issues.
