## ADDED Requirements

### Requirement: Popup modules use a cohesive visual system
The extension UI SHALL present popup modules with a consistent visual language for cards, sections, labels, controls, state messages, and action groups.

#### Scenario: User switches between popup tabs
- **WHEN** the user moves between Envio em Massa, Atualizações, and Sobre
- **THEN** each tab presents compatible spacing, typography, surfaces, and action hierarchy while preserving its own content purpose

#### Scenario: User opens the options page
- **WHEN** the user opens the extension options page
- **THEN** settings content follows the same visual language used by the popup modules

### Requirement: WhatsApp readiness is immediately legible
The popup SHALL show the current WhatsApp operational readiness before the user interacts with campaign controls.

#### Scenario: WhatsApp is ready and authenticated
- **WHEN** WPP is ready and the session is authenticated
- **THEN** the header communicates that sending is available and shows supporting ready/authenticated indicators

#### Scenario: WhatsApp is not ready or not authenticated
- **WHEN** WPP is not ready or the session is not authenticated
- **THEN** the header communicates the blocking state and the bulk send tab continues to prevent sending

### Requirement: Bulk send is presented as a campaign cockpit
The bulk send module SHALL organize existing bulk message functionality into clear visual regions for campaign preparation, content selection, safety context, execution actions, progress, and logs.

#### Scenario: User prepares a text campaign
- **WHEN** the user selects text sending and enters contacts and a message
- **THEN** the UI groups contact source, message content, safety information, and send actions in a scannable campaign flow

#### Scenario: User prepares an audio campaign
- **WHEN** the user selects audio sending and uploads an audio file
- **THEN** the UI presents the audio asset and send action as part of the same campaign flow without changing audio send behavior

#### Scenario: User imports a CSV
- **WHEN** the user uploads a CSV and selects a phone column
- **THEN** the UI surfaces import count, preview, invalid numbers, and confirm action as a distinct preparation state

### Requirement: Campaign execution feedback is visible and calm
The bulk send module SHALL communicate progress, current target, counts, completion, pause/resume/cancel states, errors, and logs without overwhelming the primary workflow.

#### Scenario: Campaign is running
- **WHEN** a campaign is sending messages
- **THEN** the UI shows progress percentage, sent count, failed count, current phone when available, and relevant pause controls

#### Scenario: Campaign is paused or completed
- **WHEN** a campaign is paused or completed
- **THEN** the UI presents the available next actions and final status clearly

#### Scenario: Logs are available
- **WHEN** log entries exist
- **THEN** the UI displays them as operational feedback while keeping the campaign controls readable

### Requirement: About module reinforces product identity
The About tab SHALL communicate product identity, current version, core capabilities, and maintenance/update context in a refined visual layout.

#### Scenario: User opens About
- **WHEN** the user opens the About tab
- **THEN** they can identify ChamaLead, its installed version, its main capabilities, and its role as a WhatsApp automation extension

### Requirement: Visual refinement preserves behavior
The visual refinement SHALL NOT change existing extension behavior for settings persistence, WhatsApp readiness checks, CSV parsing, text sending, audio sending, update checking, release downloading, or release viewing.

#### Scenario: User performs existing workflows after refinement
- **WHEN** the user uses existing settings, bulk send, CSV import, audio upload, update check, download, or release view workflows
- **THEN** the workflows behave as they did before the visual refinement except for improved presentation

### Requirement: Refined modules remain usable in popup constraints
The refined UI SHALL remain usable within the browser extension popup and narrow screen constraints.

#### Scenario: Popup width is constrained
- **WHEN** available width is narrow
- **THEN** module sections, action groups, status cards, and text content stack or wrap without horizontal overflow

#### Scenario: User navigates with assistive technology
- **WHEN** status, alert, form, and action regions are exposed to assistive technology
- **THEN** semantic roles, labels, and readable text remain available for the refined modules
