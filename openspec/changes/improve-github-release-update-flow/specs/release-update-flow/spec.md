## ADDED Requirements

### Requirement: Detect newer GitHub releases
The extension SHALL check the latest GitHub Release for the configured repository and determine whether its semantic version is newer than the installed extension version.

#### Scenario: Newer release is available
- **WHEN** the latest release tag is `v0.1.33` and the installed extension version is `0.1.32`
- **THEN** the extension records that an update is available for version `0.1.33`

#### Scenario: Installed version is current
- **WHEN** the latest release tag is `v0.1.32` and the installed extension version is `0.1.32`
- **THEN** the extension records that no update is available

### Requirement: Store normalized update metadata
The extension SHALL store normalized update metadata that can be consumed by the popup without exposing the full GitHub API response.

#### Scenario: Release metadata is fetched successfully
- **WHEN** the latest release response includes version, release URL, body, publication date, and ZIP asset URL
- **THEN** the stored update metadata includes availability, current version, latest version, release URL, changelog, publication date, download URL, and checked timestamp

#### Scenario: Release check fails
- **WHEN** the latest release request fails or returns an unsuccessful response
- **THEN** the extension records the failure without crashing the background service worker or popup

### Requirement: Show update notice in popup
The popup SHALL show an update notice when stored update metadata indicates that a newer version is available.

#### Scenario: Update is available
- **WHEN** the popup opens and update metadata indicates a newer version is available
- **THEN** the popup displays the latest version, a changelog preview or changelog section, and update actions

#### Scenario: No update is available
- **WHEN** the popup opens and update metadata indicates no newer version is available
- **THEN** the popup does not display the update notice

### Requirement: Display release changelog
The popup SHALL display changelog content from the latest GitHub Release body when an update is available.

#### Scenario: Release body exists
- **WHEN** update metadata includes release body text
- **THEN** the popup shows the changelog text or a concise preview with access to the full release details

#### Scenario: Release body is missing
- **WHEN** update metadata has no release body text
- **THEN** the popup shows a clear fallback message and still offers access to the release page when available

### Requirement: Download update package
The popup SHALL provide an action that downloads or opens the ZIP asset generated for the newer release.

#### Scenario: ZIP asset is available
- **WHEN** the user activates the update download action and update metadata includes a ZIP download URL
- **THEN** the extension starts the ZIP download or opens the ZIP download URL in the browser

#### Scenario: ZIP asset is missing
- **WHEN** the user views an available update and no ZIP download URL is present
- **THEN** the popup disables the direct download action or falls back to opening the GitHub Release page

### Requirement: Schedule update checks reliably in Manifest V3
The extension SHALL schedule recurring update checks using a Manifest V3-compatible mechanism rather than relying on a long-lived in-memory interval.

#### Scenario: Background worker starts or extension installs
- **WHEN** the background service worker starts or the extension is installed or updated
- **THEN** the extension performs or schedules an update check

#### Scenario: Recurring check interval elapses
- **WHEN** the configured recurring update check interval elapses
- **THEN** the extension checks the latest GitHub Release again

### Requirement: Produce popup-ready release notes
The release process SHALL produce GitHub Release notes that are useful to end users because the popup displays them as changelog content.

#### Scenario: User-visible change is released
- **WHEN** a new version is released through GitHub Actions
- **THEN** the GitHub Release body includes meaningful changelog content beyond only a compare link whenever user-visible changes exist

#### Scenario: Future development guidance is followed
- **WHEN** contributors prepare a user-visible update
- **THEN** project guidance instructs them to include changelog-quality notes for the release process
