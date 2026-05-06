## ADDED Requirements

### Requirement: CSV columns can be used as text message variables
The system SHALL allow users composing a bulk text campaign from an imported CSV to reference CSV columns in the main message using double-brace placeholders whose names match CSV headers.

#### Scenario: User references an imported CSV column
- **WHEN** a CSV with header `nome` is imported and the text message contains `Olá {{nome}}`
- **THEN** the system renders each recipient's message with that row's `nome` value before sending

#### Scenario: User references a header with spaces
- **WHEN** a CSV with header `Nome Cliente` is imported and the text message contains `Olá {{Nome Cliente}}`
- **THEN** the system resolves the placeholder using the matching CSV column for each recipient row

### Requirement: CSV recipients preserve row variables
The system SHALL preserve row-level CSV data for each imported recipient used in a personalized text campaign.

#### Scenario: Campaign starts from CSV import
- **WHEN** a user imports a CSV, selects the phone column, and starts a personalized text campaign
- **THEN** each send attempt has access to the current recipient phone number and that recipient's CSV column values

#### Scenario: Campaign resumes after pause
- **WHEN** a personalized CSV text campaign is paused and later resumed
- **THEN** the system continues rendering messages using the stored row variables for the remaining recipients

### Requirement: Missing variables use fallback message
The system SHALL send the configured fallback message to a recipient when the main message requires at least one variable that is missing or blank for that recipient.

#### Scenario: Recipient row has blank required value
- **WHEN** the main message contains `Olá {{nome}}` and a recipient row has an empty `nome` value
- **THEN** the system sends the fallback message to that recipient instead of the main message

#### Scenario: Recipient row has all required values
- **WHEN** the main message contains `Olá {{nome}}` and a recipient row has a non-empty `nome` value
- **THEN** the system sends the rendered personalized message to that recipient

### Requirement: Variable templates are validated before sending
The system SHALL prevent starting a personalized CSV text campaign when the main message contains placeholders that do not match imported CSV headers.

#### Scenario: Message references unknown column
- **WHEN** the imported CSV headers are `telefone,nome` and the main message contains `Olá {{empresa}}`
- **THEN** the system blocks campaign start and reports that `empresa` is not available in the CSV

#### Scenario: Missing fallback for variable message
- **WHEN** the main message contains at least one CSV placeholder and no fallback message is configured
- **THEN** the system blocks campaign start and asks the user to provide a fallback message

### Requirement: Existing non-personalized sends remain supported
The system SHALL continue supporting bulk text campaigns from manually entered numbers and audio campaigns without requiring CSV variables or fallback messages.

#### Scenario: Manual text campaign without variables
- **WHEN** a user enters phone numbers manually and writes a text message without placeholders
- **THEN** the system starts the campaign using the existing non-personalized flow

#### Scenario: Audio campaign
- **WHEN** a user starts a bulk audio campaign
- **THEN** the system does not require CSV variables or a fallback text message

### Requirement: Multi-part text behavior is preserved
The system SHALL preserve double-newline message splitting for both personalized messages and fallback messages.

#### Scenario: Personalized message contains double newline
- **WHEN** a rendered personalized message contains sections separated by double newlines
- **THEN** the system sends each section using the existing multi-part text behavior

#### Scenario: Fallback message contains double newline
- **WHEN** a fallback message is selected for a recipient and contains sections separated by double newlines
- **THEN** the system sends each fallback section using the existing multi-part text behavior
