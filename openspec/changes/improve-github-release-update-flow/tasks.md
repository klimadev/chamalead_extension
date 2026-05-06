## 1. Background Update State

- [x] 1.1 Add typed update metadata storage for release availability, versions, release URL, ZIP download URL, changelog, timestamps, and errors.
- [x] 1.2 Update GitHub Release parsing to normalize `tag_name`, compare semantic versions, and select the preferred release ZIP asset.
- [x] 1.3 Replace notification creation/click handling with runtime message handlers for getting update info, checking now, and starting the download/open-release action.
- [x] 1.4 Replace the long-lived update `setInterval` with a Manifest V3-compatible `chrome.alarms` schedule and startup/install checks.
- [x] 1.5 Update manifest permissions to remove unused `notifications` permission and add only the permissions needed for alarms/download behavior.

## 2. Popup Update Experience

- [x] 2.1 Add popup-side state loading for update metadata through `chrome.runtime.sendMessage`.
- [x] 2.2 Render an update notice near the top of the popup only when a newer version is available.
- [x] 2.3 Display latest version, changelog preview or readable changelog content, and fallback text when release notes are missing.
- [x] 2.4 Add actions for downloading the update ZIP and viewing the GitHub Release page when available.
- [x] 2.5 Add CSS for the update notice, changelog content, loading/error states, and compact popup layout.

## 3. Release Workflow And Guidance

- [x] 3.1 Update the GitHub Actions release job so release assets and release notes remain compatible with popup consumption.
- [x] 3.2 Add or document a changelog convention that produces meaningful GitHub Release bodies for user-visible updates.
- [x] 3.3 Update `AGENTS.md` to require changelog-quality release notes for future user-visible changes and version releases.
- [x] 3.4 Ensure duplicate tag/version behavior in the workflow is explicit, either by failing clearly or skipping release creation intentionally.

## 4. Validation

- [x] 4.1 Run `npm run lint` and fix any reported issues.
- [x] 4.2 Run `npm run build` and fix any reported issues.
- [ ] 4.3 Manually inspect the update flow assumptions for available update, no update, missing changelog, and missing ZIP asset cases.
- [x] 4.4 Increment the extension version in both `package.json` and `vite.config.ts`, then run `npm run build` again as required by project guidelines.
