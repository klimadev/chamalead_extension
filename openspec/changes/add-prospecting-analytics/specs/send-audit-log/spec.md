## ADDED Requirements

### Requirement: IndexedDB database is initialized on startup

The extension SHALL open or create an IndexedDB database named `chamalead_history` with an object store `sends` and the required indexes when the service worker starts.

#### Scenario: First run creates database

- **WHEN** the service worker starts and the IndexedDB database does not exist
- **THEN** it SHALL create the database with object store `sends` (keyPath: `id`) and indexes `by_timestamp`, `by_profile`, `by_target`, `by_campaign`

#### Scenario: Subsequent runs open existing database

- **WHEN** the service worker starts and the IndexedDB database already exists at the correct version
- **THEN** it SHALL open the existing database without modification

### Requirement: Send record is persisted after each message

After every send attempt (success or failure), the background SHALL persist a `SendRecord` to the IndexedDB `sends` store.

#### Scenario: Successful text message send

- **WHEN** a text message is sent successfully to a target phone
- **THEN** a SendRecord SHALL be written with `success: true`, the target phone number, the current timestamp, the message type, length, humanization config, campaign position, and profile WID

#### Scenario: Failed message send

- **WHEN** a message send fails with an error
- **THEN** a SendRecord SHALL be written with `success: false`, the error message, and all available metadata

#### Scenario: Audio message send

- **WHEN** an audio message is sent
- **THEN** a SendRecord SHALL be written with `message_type: 'audio'` and all available metadata

#### Scenario: Multi-part message send

- **WHEN** a message is split by double newlines into multiple parts
- **THEN** a single SendRecord SHALL be written for the overall send attempt (not one per part)

### Requirement: Each campaign has a unique identifier

The background SHALL generate a UUID `campaign_id` for each new campaign and include it in every SendRecord for that campaign.

#### Scenario: New campaign starts

- **WHEN** `CHAMALEAD_BULK_SEND_START` is processed successfully
- **THEN** a `campaign_id` SHALL be generated using `crypto.randomUUID()` and used for all SendRecords in this campaign

### Requirement: Analytics queries return aggregated data

The background SHALL respond to `CHAMALEAD_ANALYTICS_GET` messages with aggregated send statistics.

#### Scenario: Query for today's stats

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received with `period: 'today'`
- **THEN** the response SHALL include `summary.today` with total sent and failed counts for the current calendar day

#### Scenario: Query for weekly stats

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received with `period: 'week'`
- **THEN** the response SHALL include `summary.week` with total sent and failed counts for the last 7 days

#### Scenario: Query for all-time stats

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received with `period: 'all'`
- **THEN** the response SHALL include `summary.total` with all-time sent and failed counts

#### Scenario: Hourly breakdown

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received
- **THEN** the response SHALL include `hourly` with an array of `{ hour, sent, failed }` for each hour of the current day that has send activity

#### Scenario: Recent campaigns list

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received
- **THEN** the response SHALL include `recent_campaigns` — the last 10 campaigns ordered by most recent first, each with `campaign_id`, `started_at`, `total`, `sent`, `failed`, `profile_wid`, and `humanization_profile`

#### Scenario: No data exists

- **WHEN** `CHAMALEAD_ANALYTICS_GET` is received but the IndexedDB has no records
- **THEN** the response SHALL return zeroed counts and empty arrays

### Requirement: History can be cleared

The background SHALL respond to `CHAMALEAD_ANALYTICS_CLEAR` by removing send records from IndexedDB.

#### Scenario: Clear all history

- **WHEN** `CHAMALEAD_ANALYTICS_CLEAR` is received without parameters
- **THEN** all records in the `sends` object store SHALL be deleted

#### Scenario: Clear history before a date

- **WHEN** `CHAMALEAD_ANALYTICS_CLEAR` is received with `before: <timestamp>`
- **THEN** all records with `timestamp` less than the given value SHALL be deleted

### Requirement: IndexedDB errors do not block sending

IndexedDB write failures SHALL be logged to the console and SHALL NOT prevent the campaign from continuing.

#### Scenario: IndexedDB write fails during campaign

- **WHEN** a `SendRecord` write to IndexedDB fails (e.g., quota exceeded, transaction error)
- **THEN** the error SHALL be logged with `console.error` and the campaign SHALL continue sending normally
