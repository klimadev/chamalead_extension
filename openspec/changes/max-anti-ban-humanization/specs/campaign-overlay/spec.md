## ADDED Requirements

### Requirement: Content script injects FAB overlay on WhatsApp Web
The content script SHALL inject a fixed-position floating overlay element into the WhatsApp Web DOM when a campaign is active (status `sending` or `paused`).

#### Scenario: FAB created when campaign is active
- **WHEN** content script detects campaign state with `status === 'sending'` after polling background
- **THEN** content script SHALL create a `<div>` element with `position: fixed; bottom: 100px; right: 20px; z-index: 9999`
- **AND** SHALL append it to `document.body`

#### Scenario: FAB not created when no campaign exists
- **WHEN** content script detects campaign state `status === 'idle'` or state is null
- **THEN** content script SHALL NOT create the FAB element

### Requirement: FAB displays campaign progress in compact mode
In compact mode, the FAB SHALL display a single line with a colored status indicator and current sent count over total.

#### Scenario: Sending in progress
- **WHEN** campaign state is `{ status: 'sending', sent: 47, total: 200 }`
- **THEN** FAB SHALL display blue circle indicator and text "47/200"

#### Scenario: Campaign paused
- **WHEN** campaign state is `{ status: 'paused', sent: 30, total: 150 }`
- **THEN** FAB SHALL display yellow circle indicator and text "30/150"

#### Scenario: Campaign completed
- **WHEN** campaign state is `{ status: 'completed', sent: 200, total: 200 }`
- **THEN** FAB SHALL display green circle indicator and text "200/200"
- **AND** SHALL auto-remove after 30 seconds

#### Scenario: Campaign error
- **WHEN** campaign state is `{ status: 'error', sent: 10, failed: 5, total: 100 }`
- **THEN** FAB SHALL display red circle indicator and text "10/100"
- **AND** SHALL auto-remove after 30 seconds

### Requirement: FAB expands on click to show detailed progress
When the user clicks the compact FAB, it SHALL expand to show a progress bar, sent/failed counts, and a link to open the extension popup.

#### Scenario: Expand compact FAB
- **WHEN** user clicks the compact FAB
- **THEN** FAB SHALL expand to show a horizontal progress bar (percentage fill), sent count, failed count, and "Gerencie na extensão" link

#### Scenario: Collapse expanded FAB
- **WHEN** user clicks the collapse button on expanded FAB
- **THEN** FAB SHALL return to compact mode showing only the status indicator and count

### Requirement: FAB uses inline styles with no external CSS dependency
All FAB styling SHALL use inline styles or a single `<style>` element injected by the content script, with no dependency on WhatsApp Web's CSS classes or external stylesheets.

#### Scenario: FAB renders correctly after WhatsApp CSS update
- **WHEN** WhatsApp Web updates its CSS with new class names
- **THEN** FAB SHALL continue rendering correctly because its styles are self-contained and use `position: fixed` with absolute coordinates

### Requirement: FAB survives WhatsApp Web SPA navigation
The existing MutationObserver in content.ts SHALL re-check campaign state after detecting SPA navigation and recreate the FAB if a campaign is still active.

#### Scenario: User navigates between chats during campaign
- **WHEN** WhatsApp Web performs SPA navigation (chat change) while campaign is `sending`
- **THEN** MutationObserver handler SHALL call `chrome.runtime.sendMessage({ type: 'CHAMALEAD_BULK_SEND_GET_STATE' })` after re-injecting scripts
- **AND** if state shows active campaign, SHALL recreate the FAB overlay

### Requirement: FAB polls background for state every 2 seconds
While the FAB exists, the content script SHALL poll the background service worker every 2000ms for updated campaign state via `CHAMALEAD_BULK_SEND_GET_STATE`.

#### Scenario: Progress updates in real-time
- **WHEN** background updates campaign state (sent count changes from 47 to 48)
- **THEN** FAB SHALL reflect the new count within 2 seconds (one poll cycle)

#### Scenario: Campaign completes while FAB is visible
- **WHEN** poll returns `status: 'completed'`
- **THEN** FAB SHALL transition to green completed state, stop polling, and schedule removal after 30 seconds
