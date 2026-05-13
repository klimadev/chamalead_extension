## ADDED Requirements

### Requirement: Campaign wizard shows humanization profile selection in review step
The CampaignWizard review step SHALL display four humanization profile options as selectable cards: Conservador, Balanceado, Agressivo, and Personalizado.

#### Scenario: Profile cards displayed on review step
- **WHEN** user reaches the review step (step 3) of CampaignWizard
- **THEN** four profile cards SHALL be displayed below the message summary and above the "Iniciar campanha" button
- **AND** Balanceado SHALL be pre-selected by default

#### Scenario: User selects a different profile
- **WHEN** user clicks the "Conservador" card
- **THEN** the Conservador card SHALL show selected state (highlighted border/background)
- **AND** previously selected card SHALL deselect
- **AND** the estimate text ("~8.5h para 200 contatos") SHALL update to reflect the new profile

### Requirement: Each pre-defined profile has specific parameter values
The three pre-defined profiles SHALL use the following immutable parameter values:

| Parameter | Conservador | Balanceado | Agressivo |
|---|---|---|---|
| `minDelayMs` | 45000 | 25000 | 12000 |
| `maxDelayMs` | 180000 | 90000 | 50000 |
| `typingSpeedMs` | 220 | 150 | 90 |
| `openChat` | true | true | true |
| `readChat` | true | true | false |
| `readCount` | 5 | 2 | 0 |
| `simulateTyping` | true | true | true |
| `burstMode` | false | true | false |
| `burstSize` | 0 | 4 | 0 |
| `burstPauseMs` | 0 | 300000 | 0 |

#### Scenario: Selecting Conservador profile
- **WHEN** user selects Conservador
- **THEN** config SHALL be `{ minDelayMs: 45000, maxDelayMs: 180000, typingSpeedMs: 220, openChat: true, readChat: true, readCount: 5, simulateTyping: true, burstMode: false }`

#### Scenario: Selecting Balanceado profile
- **WHEN** user selects Balanceado
- **THEN** config SHALL include `burstMode: true, burstSize: 4, burstPauseMs: 300000`

#### Scenario: Selecting Agressivo profile
- **WHEN** user selects Agressivo
- **THEN** config SHALL include `readChat: false, readCount: 0`

### Requirement: Personalizado profile exposes all parameters as editable inputs
When the user selects the Personalizado profile, all humanization parameters SHALL become visible as range sliders or number inputs with min/max constraints.

#### Scenario: Personalizado profile selected
- **WHEN** user selects "Personalizado" card
- **THEN** an expandable settings panel SHALL appear below the profile cards
- **AND** SHALL contain inputs for: minDelayMs (5-600s), maxDelayMs (5-600s), typingSpeedMs (50-500), openChat toggle, readChat toggle, readCount (1-20), burstMode toggle, burstSize (2-10), burstPauseMs (60-900s)

#### Scenario: Personalizado inputs constrained to valid ranges
- **WHEN** user sets `minDelayMs` to 300 and `maxDelayMs` to 200 via the sliders
- **THEN** UI SHALL automatically adjust `minDelayMs` down to 200 to maintain `minDelayMs <= maxDelayMs`

### Requirement: CSV import volume recommendations
When parsing a CSV file with more than 100 contacts, the CampaignWizard SHALL display informational banners recommending appropriate humanization profiles.

#### Scenario: CSV with 100-199 contacts imported
- **WHEN** CSV parsing yields between 100 and 199 recipients
- **THEN** a yellow banner SHALL display: "⚠ Lista com X contatos. Recomendamos o perfil Conservador para segurança."

#### Scenario: CSV with 200+ contacts imported
- **WHEN** CSV parsing yields 200 or more recipients
- **THEN** an orange banner SHALL display: "⚠ Lista grande detectada (X contatos). Considere dividir em múltiplos dias. Máximo recomendado: 200-300/dia com perfil Conservador."

#### Scenario: CSV with fewer than 100 contacts imported
- **WHEN** CSV parsing yields fewer than 100 recipients
- **THEN** no recommendation banner SHALL be displayed

### Requirement: Humanization timer estimate displayed
The review step SHALL show an estimated total campaign duration based on recipient count, average message length, and selected humanization profile.

#### Scenario: Duration estimate for 200 contacts with Balanced profile
- **WHEN** campaign has 200 recipients, average message length 150 chars, and Balanceado profile selected
- **THEN** estimate SHALL display "~5.5 horas" (approximately)

#### Scenario: Estimate updated on profile change
- **WHEN** user switches from Balanceado to Conservador for 200 contacts
- **THEN** estimate SHALL change from "~5.5 horas" to "~8.5 horas"

### Requirement: Humanization config propagated to background via startBulkSend
The selected `HumanizationConfig` SHALL be included as part of the `CHAMALEAD_BULK_SEND_START` payload sent to the background service worker.

#### Scenario: Campaign started with Balanced profile
- **WHEN** user clicks "Iniciar campanha" with Balanceado profile selected
- **THEN** `startBulkSend` SHALL include `humanizationConfig` in the message payload
- **AND** background SHALL store the config in `StoredBulkSendState` as `humanizationConfig`

### Requirement: Config summary labels are concise and scannable
Each profile card SHALL display a 1-2 line summary label that fits within the popup width without wrapping.

#### Scenario: Profile card labels
- **WHEN** profile cards are rendered
- **THEN** Conservador SHALL show "🐢 Envio lento e seguro · ~8.5h/200"
- **AND** Balanceado SHALL show "⚡ Ritmo natural · ~5.5h/200"
- **AND** Agressivo SHALL show "🚀 Volume máximo · ~2.5h/200"
- **AND** Personalizado SHALL show "🔧 Ajuste cada parâmetro"

### Requirement: BulkSendForm has feature parity with CampaignWizard for humanization
The BulkSendForm SHALL display the same humanization profile selection as CampaignWizard in its review/send section.

#### Scenario: Humanization profiles visible in BulkSendForm
- **WHEN** user is on BulkSendForm with contacts loaded
- **THEN** the same four profile cards (Conservador, Balanceado, Agressivo, Personalizado) SHALL be visible before the "Enviar" button
- **AND** Balanceado SHALL be pre-selected by default
