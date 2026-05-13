## ADDED Requirements

### Requirement: Popup home screen detects active campaigns on mount
The popup home screen SHALL query the background for campaign state when it mounts and SHALL display a campaign status card if a campaign is active.

#### Scenario: Campaign in progress when popup opens
- **WHEN** popup mounts and `CHAMALEAD_BULK_SEND_GET_STATE` returns `{ status: 'sending', sent: 47, total: 200 }`
- **THEN** home screen SHALL display "📊 Campanha em andamento" card with sent/total, progress bar, and "Ver campanha" link button

#### Scenario: Campaign paused when popup opens
- **WHEN** popup mounts and state is `{ status: 'paused', sent: 30, total: 200 }`
- **THEN** home screen SHALL display "📊 Campanha pausada" card with a "Retomar" button in addition to "Ver campanha"

#### Scenario: No active campaign
- **WHEN** popup mounts and state is `{ status: 'idle' }` or null
- **THEN** home screen SHALL display the default "Nova Campanha" card as before

### Requirement: Home screen polls active campaign state periodically
While an active campaign card is shown on the home screen, the popup SHALL poll campaign state every 5000ms.

#### Scenario: Campaign completes while user is on home screen
- **WHEN** polling returns `{ status: 'completed', sent: 200, total: 200 }`
- **THEN** campaign card SHALL update to show "✅ Campanha concluída" and remove after 10 seconds, reverting to "Nova Campanha"

### Requirement: Anti-overwrite protection on campaign start
The background SHALL reject `CHAMALEAD_BULK_SEND_START` if an active campaign already exists, preventing accidental overwrite.

#### Scenario: User attempts to start new campaign while one is running
- **WHEN** background receives `CHAMALEAD_BULK_SEND_START` and stored state has `status === 'sending'`
- **THEN** background SHALL respond with `{ success: false, error: 'Já existe uma campanha em andamento...' }`
- **AND** SHALL NOT modify the stored campaign state

#### Scenario: Starting campaign when previous one completed
- **WHEN** background receives `CHAMALEAD_BULK_SEND_START` and stored state has `status === 'completed'`
- **THEN** background SHALL proceed normally and create the new campaign

#### Scenario: Popup handles overwrite rejection gracefully
- **WHEN** popup receives `{ success: false, error: 'Já existe uma campanha...' }` from `startBulkSend`
- **THEN** popup SHALL display a confirmation dialog: "Já existe uma campanha em andamento (47/200). Deseja cancelá-la e iniciar uma nova?"
- **AND** if user confirms, SHALL send `CHAMALEAD_BULK_SEND_STOP` then retry `CHAMALEAD_BULK_SEND_START`

### Requirement: Extension icon badge shows campaign progress
The background SHALL update the extension icon badge text to show sent message count during active campaigns and clear it when idle.

#### Scenario: Campaign sending
- **WHEN** campaign is `sending` and `sent = 47`
- **THEN** `chrome.action.setBadgeText({ text: '47' })` SHALL be called with blue background `#3B82F6`

#### Scenario: Campaign completed
- **WHEN** campaign status changes to `completed` with `sent = 200`
- **THEN** badge SHALL show '200' with green background `#10B981` for 5 minutes, then clear

#### Scenario: Campaign stopped or idle
- **WHEN** campaign state is cleared or `status === 'idle'`
- **THEN** `chrome.action.setBadgeText({ text: '' })` SHALL be called

#### Scenario: Badge truncation for high counts
- **WHEN** `sent > 9999`
- **THEN** badge SHALL show '9999+'

### Requirement: Campaign result persists in storage until user dismisses
After a campaign completes, the stored state SHALL persist in `chrome.storage.local` for at least 30 minutes to allow the popup to reconnect and show results.

#### Scenario: User opens popup after campaign finished
- **WHEN** popup mounts and stored state has `status: 'completed'` and was completed less than 30 minutes ago
- **THEN** popup SHALL transition to campaign view showing completion results
