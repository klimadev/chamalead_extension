## ADDED Requirements

### Requirement: Bulk send sections use progressive disclosure
The bulk send form SHALL show only relevant sections based on the current campaign state (idle, sending, paused, completed). Non-essential sections SHALL be hidden or collapsed until needed.

#### Scenario: User sees the form in idle state (no campaign running)
- **WHEN** the campaign is idle (not sending, not paused, not completed)
- **THEN** the UI shows contact source, message content, and send action as the primary visible sections

#### Scenario: User is sending a campaign
- **WHEN** the campaign status is "sending"
- **THEN** the UI collapses contact source and message content sections (showing summary only), and prominently displays execution progress bar, sent/failed counts, current phone, and pause/cancel controls

#### Scenario: Campaign is paused
- **WHEN** the campaign status is "paused"
- **THEN** the UI shows progress at pause point, pause state label, and resume/cancel action buttons

#### Scenario: Campaign is completed
- **WHEN** the campaign status is "completed"
- **THEN** the UI shows completion message, final sent/failed counts, a "View logs" option, and a "New campaign" reset button

#### Scenario: User toggles visibility of collapsed sections during sending
- **WHEN** the user clicks to expand a collapsed section during sending
- **THEN** the section expands to show full content without interrupting the campaign

### Requirement: Audio UI hides codec complexity
The audio upload UI SHALL present a simplified flow: upload, processing, ready. The internal 4-method parallel conversion pipeline SHALL run invisibly. The system SHALL automatically select the best available codec.

#### Scenario: User uploads an audio file
- **WHEN** the user selects an audio file
- **THEN** the UI shows file name and a "Processando áudio..." indicator with spinner; no individual codec cards are visible

#### Scenario: Audio processing completes successfully
- **WHEN** at least one conversion method succeeds
- **THEN** the UI shows "Pronto" with the file name and a single audio player; the system automatically selects the best available method (auto > ogg > webm > raw)

#### Scenario: Audio processing fails completely
- **WHEN** all conversion methods fail
- **THEN** the UI shows an error message: "Não foi possível processar o áudio. Tente outro arquivo."

#### Scenario: User wants to change the audio file
- **WHEN** the user clicks "Trocar" while audio is ready
- **THEN** the UI returns to the file upload state

#### Scenario: User wants to remove the audio
- **WHEN** the user clicks "Remover" while audio is ready
- **THEN** the audio is cleared and the UI returns to the initial upload state

### Requirement: Safety context is available but not dominant
The safety information section (interval, humanized mode) SHALL be accessible but SHALL NOT occupy primary visual space before the user initiates a campaign.

#### Scenario: User prepares a campaign in idle state
- **WHEN** the campaign is idle
- **THEN** safety information is shown as a compact, collapsible section or a brief line of text, not as a full-sized card

#### Scenario: User initiates a campaign
- **WHEN** the user clicks "Iniciar campanha"
- **THEN** safety information remains accessible if the user expands the section but does not block the progress view

### Requirement: Campaign execution actions are always reachable
Primary campaign actions (send, pause, resume, cancel, reset) SHALL remain visible and reachable in all campaign states without requiring the user to scroll through collapsed sections.

#### Scenario: User needs to pause a running campaign
- **WHEN** a campaign is sending
- **THEN** the pause button is immediately visible in the action area without requiring scroll or expand

#### Scenario: User needs to cancel a paused campaign
- **WHEN** a campaign is paused
- **THEN** the cancel button is immediately visible in the action area
