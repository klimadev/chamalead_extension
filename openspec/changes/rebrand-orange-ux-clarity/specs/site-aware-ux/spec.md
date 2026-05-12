## ADDED Requirements

### Requirement: Site context badge is always visible
The popup SHALL display a persistent badge at the top that identifies the active site context (WhatsApp Web, Instagram, or other). This badge SHALL remain in the same position regardless of which tab the user is viewing.

#### Scenario: User opens popup on WhatsApp Web
- **WHEN** the active tab is WhatsApp Web
- **THEN** the site badge shows "WhatsApp Web" with a success/ready indicator

#### Scenario: User opens popup on Instagram
- **WHEN** the active tab is Instagram
- **THEN** the site badge shows "Instagram" with an active indicator

#### Scenario: User opens popup on an unsupported site
- **WHEN** the active tab is any site other than WhatsApp or Instagram
- **THEN** the site badge shows the site hostname (e.g., "google.com") with a neutral/unavailable indicator

#### Scenario: Site context is still loading
- **WHEN** the extension is detecting the active site
- **THEN** the site badge shows a loading state with neutral styling

### Requirement: WhatsApp status uses human-readable language
All WhatsApp readiness labels SHALL use plain, non-technical Portuguese. Developer jargon (WPP, sessão, autenticada) SHALL be replaced with user-facing terms (WhatsApp, login, conta).

#### Scenario: WhatsApp is fully ready
- **WHEN** WPP is ready and session is authenticated
- **THEN** the status reads "Pronto pra disparar" with supporting text "Tudo pronto para começar."

#### Scenario: WhatsApp is open but not logged in
- **WHEN** WPP is ready but session is not authenticated
- **THEN** the status reads "Faça login no WhatsApp" with supporting text "Abra o WhatsApp e faça login."

#### Scenario: WhatsApp is not detected
- **WHEN** WPP is not ready and not loading
- **THEN** the status reads "WhatsApp não detectado" with supporting text "Abra o WhatsApp Web primeiro."

#### Scenario: WhatsApp status is being checked
- **WHEN** the extension is verifying WhatsApp readiness
- **THEN** the status reads "Verificando WhatsApp..." with a neutral loading indicator

### Requirement: Status chips use 3-tier human language
The readiness chips in the header SHALL use exactly 3 states with human-readable labels, replacing the current 4-state developer language.

#### Scenario: WhatsApp is ready and authenticated
- **WHEN** WPP reports ready + authenticated
- **THEN** the main status chip displays "Pronto" in success green

#### Scenario: WhatsApp is ready but not authenticated
- **WHEN** WPP reports ready but not authenticated
- **THEN** the main status chip displays "Aguardando login" in warning amber

#### Scenario: WhatsApp is not available
- **WHEN** WPP is not ready
- **THEN** the main status chip displays "Indisponível" in danger red

#### Scenario: Status is being verified
- **WHEN** the extension is loading WPP status
- **THEN** the main status chip displays "Verificando" in neutral gray

### Requirement: Unsupported sites show a direct action to open WhatsApp Web
When the active site is not WhatsApp or Instagram, the popup SHALL display a prominent button to open WhatsApp Web in a new browser tab.

#### Scenario: User is on an unsupported site
- **WHEN** the active site is not WhatsApp or Instagram
- **THEN** a button labeled "Abrir WhatsApp Web" is visible, and clicking it opens https://web.whatsapp.com in a new tab via chrome.tabs.create

#### Scenario: User is on WhatsApp Web
- **WHEN** the active site is WhatsApp Web
- **THEN** the "Abrir WhatsApp Web" button is not visible

### Requirement: Welcome card appears for first-time users
First-time users (those without a `chamalead_onboarded` key in chrome.storage.local) SHALL see a welcome card that introduces ChamaLead's capabilities with a call-to-action to open WhatsApp Web.

#### Scenario: First-time user opens popup on any site
- **WHEN** the `chamalead_onboarded` key does not exist in chrome.storage.local AND the popup opens
- **THEN** a welcome card displays with the extension name, a brief description, a list of capabilities, and a button to open WhatsApp Web

#### Scenario: User dismisses the welcome card
- **WHEN** the user clicks "Abrir WhatsApp Web" on the welcome card OR the welcome card is no longer applicable
- **THEN** chrome.storage.local sets `chamalead_onboarded` to `true` and the welcome card does not appear on subsequent opens

#### Scenario: Returning user opens popup
- **WHEN** the `chamalead_onboarded` key exists in chrome.storage.local
- **THEN** the welcome card does not appear
