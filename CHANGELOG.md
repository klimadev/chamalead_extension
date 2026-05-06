# Changelog

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
