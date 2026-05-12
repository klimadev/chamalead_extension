## MODIFIED Requirements

### Requirement: WhatsApp readiness is immediately legible
The popup SHALL show the current WhatsApp operational readiness using human-readable Portuguese labels before the user interacts with campaign controls. Status chips SHALL use 3 tiers: ready (green), awaiting login (amber), unavailable (red).

#### Scenario: WhatsApp is ready and authenticated
- **WHEN** WPP is ready and the session is authenticated
- **THEN** the header communicates "Pronto pra disparar" and shows a "Pronto" chip in success green with supporting indicator "WhatsApp aberto" and "Login confirmado"

#### Scenario: WhatsApp is open but not authenticated
- **WHEN** WPP is ready but the session is not authenticated
- **THEN** the header communicates "Faça login no WhatsApp" and shows an "Aguardando login" chip in warning amber with supporting indicator "WhatsApp aberto" and "Sem login"

#### Scenario: WhatsApp is not available
- **WHEN** WPP is not ready and not loading
- **THEN** the header communicates "WhatsApp não detectado" and shows an "Indisponível" chip in danger red

### Requirement: Bulk send is presented as a campaign cockpit
The bulk send module SHALL organize existing bulk message functionality into clear visual regions with progressive disclosure: preparation (contacts + message) always visible; execution (progress, actions) dominant during sending; feedback (logs) available on demand.

#### Scenario: User prepares a text campaign
- **WHEN** the user selects text sending and enters contacts and a message in idle state
- **THEN** the UI groups contact source, message content, and send action in a scannable campaign flow; safety information is compact/collapsible

#### Scenario: User prepares an audio campaign
- **WHEN** the user selects audio sending and uploads an audio file
- **THEN** the UI presents a simplified audio flow (upload → processing → ready with single player) without exposing individual codec methods; the system auto-selects the best conversion

#### Scenario: User imports a CSV
- **WHEN** the user uploads a CSV and selects a phone column
- **THEN** the UI surfaces import count, preview, invalid numbers, and confirm action as a distinct preparation state

### Requirement: Campaign execution feedback is visible and calm
The bulk send module SHALL communicate progress, current target, counts, completion, pause/resume/cancel states, errors, and logs. During sending, the execution view SHALL take visual priority over preparation sections.

#### Scenario: Campaign is running
- **WHEN** a campaign is sending messages
- **THEN** the UI shows progress percentage, sent count, failed count, current phone when available, and pause control; contact and message sections collapse to summary view

#### Scenario: Campaign is paused or completed
- **WHEN** a campaign is paused or completed
- **THEN** the UI presents the available next actions (resume/cancel or new campaign/view logs) and final status clearly

#### Scenario: Logs are available
- **WHEN** log entries exist
- **THEN** the UI displays them as operational feedback accessible via expand or in the completed state view

### Requirement: About module reinforces product identity
The About tab SHALL communicate product identity, current version, core capabilities, and maintenance/update context using the orange brand color system. The logo gradient SHALL use orange (#f97316 → #fb923c).

#### Scenario: User opens About
- **WHEN** the user opens the About tab
- **THEN** they can identify ChamaLead with orange branding, its installed version, its main capabilities, and its role as a WhatsApp automation extension

## ADDED Requirements

### Requirement: Site context badge is always visible in popup header
The popup header SHALL include a persistent site context badge with human-readable labels, positioned identically regardless of active tab.

#### Scenario: Popup opens on any site
- **WHEN** the popup opens on any active tab
- **THEN** the site badge is visible at the top of the popup, showing the site name (WhatsApp Web, Instagram, or hostname) and a readiness indicator

### Requirement: Unsupported sites offer direct WhatsApp Web access
When the active site is not supported, the popup SHALL display a button to open WhatsApp Web in a new tab.

#### Scenario: User is on an unsupported site
- **WHEN** the active site is not WhatsApp or Instagram
- **THEN** a button labeled "Abrir WhatsApp Web" is visible and opens https://web.whatsapp.com in a new tab on click

### Requirement: First-time users see a welcome card
Users who have not previously seen the welcome card SHALL be presented with an introductory card explaining ChamaLead's capabilities.

#### Scenario: First-time user opens the popup
- **WHEN** the user has no `chamalead_onboarded` key in storage
- **THEN** a welcome card appears with extension capabilities and a call-to-action to open WhatsApp Web
