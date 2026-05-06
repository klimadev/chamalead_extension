## Context

ChamaLead is a Manifest V3 browser extension. The current update flow in `src/extension/background.ts` fetches `https://api.github.com/repos/klimadev/chamalead_extension/releases/latest`, compares the release tag with `chrome.runtime.getManifest().version`, and shows a browser notification when a newer version exists. Clicking the notification opens the latest release page.

This has three practical issues:

- Browser notifications are easy to miss and require a permission that is unrelated to the core product experience.
- The popup does not know whether an update exists, so users cannot act from the UI they already use.
- GitHub Releases currently rely on generated release notes, which may only show a compare link and may not provide useful changelog content for the popup.

The extension cannot safely self-replace its installed files from within the popup. The realistic update action for the current distribution model is to download the release ZIP and let the user install/reload it outside the extension.

## Goals / Non-Goals

**Goals:**

- Show update availability inside the popup when a newer GitHub Release exists.
- Display useful changelog text from the latest GitHub Release.
- Let the user download the generated release ZIP directly from the popup.
- Keep GitHub Release fetching centralized in the background service worker.
- Make MV3 scheduling more reliable than a long-lived `setInterval`.
- Ensure future release notes are written with popup display in mind.

**Non-Goals:**

- Automatically install or reload the extension after downloading a ZIP.
- Implement Chrome Web Store publishing.
- Implement self-hosted CRX auto-update through `update_url`.
- Add a new external release service or backend.
- Introduce a full changelog management dependency unless later needed.

## Decisions

### Use the background service worker as the update source of truth

The background worker will fetch GitHub Releases, compare versions, normalize release data, and store a compact update state in `chrome.storage.local`. The popup will request this state through `chrome.runtime.sendMessage` rather than fetching GitHub directly.

Rationale: this avoids duplicated network/version parsing logic, keeps GitHub API interaction outside the React UI, and lets update checks happen even before the popup opens.

Alternative considered: fetch GitHub Releases directly from the popup. This is simpler at first, but creates duplicate state and makes the update card dependent on popup lifecycle.

### Replace `setInterval` with `chrome.alarms`

The update check should run on startup/install and through a named Chrome alarm, for example `CHAMALEAD_UPDATE_CHECK`. The alarm interval can remain roughly six hours.

Rationale: Manifest V3 service workers are suspended when idle, so an in-memory interval is not reliable. Alarms are the browser-supported scheduling mechanism for extension background work.

Alternative considered: keep `setInterval`. This may work during active service worker periods but is unreliable after suspension.

### Store normalized update metadata

The stored state should include only data needed by the UI and download flow:

```ts
interface ReleaseUpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string | null
  changelog: string | null
  publishedAt: string | null
  checkedAt: string
  error?: string
}
```

The background should identify the download URL from release assets, preferring an asset named like `chamalead-extension-<version>.zip` and falling back to the first `.zip` release asset when appropriate.

Rationale: the popup needs a stable shape and should not depend on the full GitHub API response.

Alternative considered: store the full release JSON. This is more flexible but noisier, less type-safe, and increases coupling to GitHub response details.

### Download the ZIP rather than attempting auto-install

The popup action should download the release asset URL. If the `downloads` permission is added, the background can call `chrome.downloads.download`; otherwise the popup/background can open the asset URL in a tab and let the browser download it normally.

Rationale: extension self-update is constrained by browser distribution rules. A direct ZIP download gives users the update package without pretending the extension can install itself.

Alternative considered: use `chrome.runtime.reload()` after download. This reloads the existing installed extension, not the newly downloaded ZIP, so it does not complete the update.

### Render update notice in the popup, not only in About

The update notice should appear near the top of the popup when an update is available, with the latest version, changelog preview or expandable changelog, and actions to download or view the release.

Rationale: updates are operationally important and should be visible without requiring users to discover the About tab.

Alternative considered: show only in the About tab. This is less disruptive but easy to miss.

### Improve release notes at the source

GitHub Actions should continue producing the release ZIP asset, but release notes should be useful enough for end users. This can be achieved through better commit/PR descriptions and/or a `CHANGELOG.md` convention referenced by `AGENTS.md`. The popup will consume `release.body` as the changelog source.

Rationale: if release notes are weak, the popup changelog will also be weak. The project guidance should make release-note quality part of the update workflow.

Alternative considered: generate a separate machine-readable changelog file. This could be useful later, but GitHub Release bodies are already available through the existing API check.

## Risks / Trade-offs

- GitHub API rate limits or temporary failures -> Store the last checked state with `checkedAt` and optional `error`; popup can show stale successful data only when an update is known.
- Release missing ZIP asset -> Show update availability but disable or alter the download action with a clear fallback to the release page.
- Changelog body too long or Markdown-heavy -> Render a concise preview by default and provide a reveal/open-release action for full details.
- Added `downloads` or `alarms` permissions may require manifest review -> Remove `notifications` if no longer used, and add only the permissions needed for the selected download/scheduling path.
- Users may expect one-click installation -> Copy and UI should say “Baixar atualização” rather than “Atualizar agora”.

## Migration Plan

1. Add the new update state and message handlers while preserving the existing release check behavior.
2. Move visible update communication from notifications to popup UI.
3. Replace interval scheduling with `chrome.alarms` and update manifest permissions accordingly.
4. Adjust GitHub Actions and `AGENTS.md` release-note guidance.
5. Remove notification code and `notifications` permission if no remaining feature uses them.

Rollback is straightforward: remove the popup update card/message handlers and restore the previous notification path if needed. No persisted user data migration is required; update metadata in `chrome.storage.local` can be overwritten or ignored.

## Open Questions

- Should the download use `chrome.downloads.download` for a controlled filename, or simply open `browser_download_url` in a tab to avoid the `downloads` permission?
- Should the popup show full Markdown-like changelog text, plain text only, or a short preview plus “Ver release” link?
- Should release creation be skipped when the tag already exists, or should the workflow fail loudly to catch versioning mistakes?
