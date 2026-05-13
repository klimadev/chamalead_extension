## ADDED Requirements

### Requirement: User can list WhatsApp groups with selection

The system SHALL display all WhatsApp groups in the popup with checkboxes for multi-selection. Each group SHALL show its name. The list SHALL be fetched from `WPP.chat.list()` filtered by `isGroup === true`.

#### Scenario: Groups loaded successfully
- **WHEN** the user navigates to "Extrair Contatos" and WhatsApp is ready
- **THEN** the system displays all groups with checkboxes

#### Scenario: No groups available
- **WHEN** the user navigates to "Extrair Contatos" but the chat list contains no groups
- **THEN** the system displays an empty state message "Nenhum grupo encontrado"

#### Scenario: WhatsApp not ready
- **WHEN** the user navigates to "Extrair Contatos" but WhatsApp is not authenticated
- **THEN** the system displays the "Conecte ao WhatsApp" locked state

### Requirement: User can select groups for extraction

The system SHALL allow the user to select one or more groups via checkboxes. A "Selecionar todos" toggle SHALL be available when groups exist.

#### Scenario: Single group selected
- **WHEN** the user checks one group
- **THEN** the "Extrair" button becomes enabled and shows "Extrair 1 grupo"

#### Scenario: Multiple groups selected
- **WHEN** the user checks three groups
- **THEN** the "Extrair" button shows "Extrair 3 grupos"

#### Scenario: No groups selected
- **WHEN** the user has no groups checked
- **THEN** the "Extrair" button is disabled

#### Scenario: Select all toggled
- **WHEN** the user clicks "Selecionar todos"
- **THEN** all groups are checked and the button updates accordingly

### Requirement: User can extract participants from selected groups

The system SHALL extract participants from each selected group via `WPP.group.getParticipants()`. For each participant, the system SHALL parse the phone number from `id._serialized`. Progress SHALL be shown per group. Groups that time out or fail SHALL be skipped with a summary message.

#### Scenario: Successful extraction of one group
- **WHEN** the user clicks "Extrair" with one group selected
- **THEN** the system fetches participants, generates CSV, and triggers download

#### Scenario: Successful extraction of multiple groups
- **WHEN** the user clicks "Extrair" with three groups selected
- **THEN** the system processes each group sequentially, shows progress (e.g., "Processando 2/3"), and generates a combined CSV

#### Scenario: Group times out
- **WHEN** a group's participant extraction exceeds the timeout (2500ms)
- **THEN** the system skips that group, logs the failure, and continues with remaining groups

#### Scenario: Group has no participants
- **WHEN** a group returns zero participants
- **THEN** the system skips that group and shows it in the summary as "0 contatos"

### Requirement: CSV format is correct

The system SHALL generate a CSV with header row `group_name,phone,is_admin` and one row per participant. Phone numbers SHALL be extracted from the participant ID by removing the `@c.us` suffix. The `is_admin` field SHALL be `true` or `false`. Group names containing commas or quotes SHALL be properly escaped.

#### Scenario: CSV generation with multiple participants
- **WHEN** extraction completes with participants from "Vendas" group including admin +5551999999999 and member +555188888888
- **THEN** the CSV contains:
  ```
  group_name,phone,is_admin
  Vendas,5551999999999,true
  Vendas,555188888888,false
  ```

#### Scenario: Group name contains comma
- **WHEN** a group name is "Amigos, Família & Cia"
- **THEN** the name is wrapped in double quotes: `"Amigos, Família & Cia"`

#### Scenario: Group name contains double quote
- **WHEN** a group name is `Grupo "Top"`
- **THEN** the name is escaped as `"Grupo ""Top"""`

### Requirement: Participants with @lid IDs are excluded

The system SHALL exclude any participant whose `id._serialized` contains `@lid` from the extraction results. These IDs represent internal WhatsApp identifiers, not real contacts.

#### Scenario: Mixed participants including @lid
- **WHEN** a group has participants with IDs `5511999999999@c.us`, `@lid_abc`, and `5511888888888@c.us`
- **THEN** only the two `@c.us` participants are included in the CSV; the `@lid` participant is excluded

#### Scenario: All participants are @lid
- **WHEN** a group has only participants with `@lid` IDs
- **THEN** the group is shown in the summary as "0 contatos (todos @lid)"

### Requirement: CSV download is triggered

The system SHALL trigger a browser download of the generated CSV file named `chamalead_contatos.csv`.

#### Scenario: Download triggered
- **WHEN** extraction completes and CSV is generated
- **THEN** the browser downloads `chamalead_contatos.csv` and shows a success summary in the popup
