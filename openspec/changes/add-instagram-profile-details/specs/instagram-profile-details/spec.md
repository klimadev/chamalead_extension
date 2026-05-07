## ADDED Requirements

### Requirement: Instagram site detection
The system SHALL recognize active tabs whose URL starts with `https://www.instagram.com/` as Instagram and SHALL expose Instagram-specific profile functionality only for that site context.

#### Scenario: Active tab is Instagram
- **WHEN** the popup resolves an active tab URL under `https://www.instagram.com/`
- **THEN** the popup identifies the site as Instagram and shows the Instagram profile feature tab alongside global tabs

#### Scenario: Active tab is not Instagram or WhatsApp
- **WHEN** the popup resolves an active tab URL that is not a supported site
- **THEN** the popup shows the unsupported-site state and does not show the Instagram profile feature tab

### Requirement: Current profile query
The system SHALL query details for the Instagram profile currently open in the active tab using the user's current Instagram page session and SHALL keep the operation read-only.

#### Scenario: Reference script is used
- **WHEN** the Instagram profile query is implemented
- **THEN** it follows the provided console reference flow for extracting SSR/session values and building the GraphQL request against `https://www.instagram.com/graphql/query`
- **AND** it uses the fixed reference `doc_id` value for this change

#### Scenario: Profile page has required session values
- **WHEN** the user opens the popup on an Instagram profile page with the required profile ID, actor/session values, and tokens available
- **THEN** the system requests the Instagram profile GraphQL document for that profile and returns normalized profile details

#### Scenario: Active Instagram page is not a profile
- **WHEN** the user opens the popup on an Instagram page where no current profile ID can be resolved
- **THEN** the system does not make a profile details request and shows guidance to open an Instagram profile page

#### Scenario: Session values are missing
- **WHEN** the user opens the popup on an Instagram profile page but required session tokens or app identifiers cannot be resolved
- **THEN** the system shows a token/session error state without exposing raw token values

### Requirement: Profile details display
The system SHALL display a concise, normalized summary of the current Instagram profile when the profile query succeeds.

#### Scenario: Raw GraphQL payload is normalized
- **WHEN** the profile query succeeds and returns `data.user`
- **THEN** the system interprets that object as the source contract and maps the available fields into the popup summary instead of rendering the raw payload directly

#### Scenario: Public profile query succeeds
- **WHEN** the Instagram profile query returns a successful response with `data.user`
- **THEN** the popup displays available identity, profile image, biography, links, follower count, following count, media count, verification status, privacy status, business status, and linked Facebook page information

#### Scenario: Optional fields are absent
- **WHEN** the Instagram profile response omits optional fields such as external links, category, linked Facebook page, or friendship status
- **THEN** the popup still renders the available profile summary without failing

#### Scenario: Friendship status is available
- **WHEN** the Instagram profile response includes friendship status for the viewer
- **THEN** the popup displays the available relationship indicators such as following, followed-by, outgoing request, blocking, or restricted state

### Requirement: Error handling and retry
The system SHALL provide explicit user-facing states for loading, unsupported profile context, missing session data, unauthenticated access, GraphQL errors, and network failures.

#### Scenario: GraphQL response contains errors
- **WHEN** the Instagram GraphQL endpoint responds with an `errors` field or non-ok status
- **THEN** the popup shows a query error state and allows the user to retry the profile consultation

#### Scenario: Network request fails
- **WHEN** the Instagram profile request fails due to network or runtime messaging error
- **THEN** the popup shows a network/runtime error state and allows the user to retry the profile consultation

#### Scenario: Query is in progress
- **WHEN** the profile consultation is running
- **THEN** the popup shows a loading state and does not display stale profile details as if they were current

### Requirement: Ephemeral token handling
The system SHALL NOT persist Instagram CSRF, LSD, DTSG, app ID, actor ID, or raw GraphQL payloads in extension storage.

#### Scenario: Profile query completes
- **WHEN** an Instagram profile query succeeds or fails
- **THEN** the system does not write Instagram tokens, actor/session identifiers, or raw GraphQL payloads to `chrome.storage`

#### Scenario: Diagnostic logging occurs
- **WHEN** the Instagram feature logs diagnostic information
- **THEN** the logs do not include raw CSRF, LSD, DTSG, app ID, or actor token values
