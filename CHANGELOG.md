# Changelog

## [0.1.49] - 2026-05-07
### Fixed
- Instagram profile bridge now accepts the newer payload shape with top-level follower, following, and media counters
- Instagram profile details now fall back to `linked_fb_info` and `is_business` when the legacy fields are absent

## [0.1.48] - 2026-05-07
### Changed
- Instagram popup copy is now shorter and more scannable across loading, empty, error, and action states
- Popup site/status text now uses tighter labels and descriptions for narrow popup layouts

## [0.1.47] - 2026-05-07
### Changed
- Instagram profile consultation now runs only on popup open or manual refresh instead of polling in the background
- Instagram profile presentation now uses a denser summary header, stat cards, and a cleaner details grid

## [0.1.46] - 2026-05-07
### Fixed
- Instagram profile bridge now reads session tokens with the same SSR selectors as the working console script
- Instagram profile query now sends the reference GraphQL payload shape, avoiding false `missing_tokens` failures on valid sessions

## [0.1.45] - 2026-05-07
### Added
- Instagram profile details support in the popup for the active Instagram Web profile
- Read-only Instagram profile consultation through a page-context bridge and GraphQL query

### Changed
- Site detection and manifest wiring now cover both WhatsApp and Instagram
- Popup tabs now switch between WhatsApp bulk send and Instagram profile details by site

### Fixed
- Instagram page injection is isolated from WhatsApp WA-JS behavior

## [0.1.44] - 2026-05-07
### Added
- Active site detection in the popup with a clear unsupported-site state
- Lightweight site registry foundation for future site-specific features

### Changed
- Popup composition now separates WhatsApp-specific actions from global tabs like updates and about
- WhatsApp remains the only operational site in this base architecture change

## [0.1.42] - 2026-05-06
### Changed
- Refined popup, bulk send, and settings surfaces into a more cohesive operational layout.

### Fixed
- WhatsApp readiness now presents clearer loading, ready, and blocked states in the popup header.

## [0.1.41] - 2026-05-06
### Fixed
- Popup no longer shifts horizontally when switching to the updates tab

## [0.1.40] - 2026-05-06
### Changed
- Rebuilt the popup updates tab with a dedicated component and clearer state handling

### Fixed
- Initial updates screen no longer shows a false "up to date" state before any real check
- Update status sync between popup and background is now simpler and more predictable

## [0.1.39] - 2026-05-06
### Fixed
- Update check result now persists correctly in popup (fixed state management)
- Removed reference to undefined `hasEverChecked` variable
- Update check now uses background response directly instead of redundant storage call

## [0.1.33] - 2026-05-06
### Added
- In-popup update notice when newer GitHub Release is available
- Changelog preview from GitHub Release body in popup
- Direct download action for release ZIP asset
- Update check using chrome.alarms for MV3 compatibility

### Changed
- Replaced browser notifications with popup-based update notice
- Update checks now use chrome.alarms instead of setInterval
- Removed notifications permission from manifest

### Fixed
- Update metadata now stored in chrome.storage.local for popup consumption

## [0.1.32] - 2026-05-06
### Added
- Initial release with bulk send functionality
- WhatsApp Web integration via WPPConnect WA-JS
- CSV-based mass messaging
- Audio mass messaging (PTT)
- Humanized sending with random intervals
- Pause/resume functionality
