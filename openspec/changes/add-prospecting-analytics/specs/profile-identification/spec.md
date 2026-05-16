## ADDED Requirements

### Requirement: Page bridge exposes logged-in user WID

The page bridge SHALL respond to `CHAMALEAD_PAGE_GET_PROFILE` messages with the WhatsApp ID of the currently logged-in user.

#### Scenario: WPP is ready and authenticated

- **WHEN** the page bridge receives `CHAMALEAD_PAGE_GET_PROFILE` and `WPP.conn` is available and authenticated
- **THEN** it SHALL respond with `{ wid: "<phone>@c.us", pushname: "<name>" }`

#### Scenario: WPP is not ready

- **WHEN** the page bridge receives `CHAMALEAD_PAGE_GET_PROFILE` and `WPP.isReady` is false
- **THEN** it SHALL respond with `{ wid: "", pushname: "" }`

#### Scenario: WPP.conn.wid is unavailable

- **WHEN** the page bridge receives `CHAMALEAD_PAGE_GET_PROFILE`, WPP is ready but `WPP.conn.wid` is undefined or throws
- **THEN** it SHALL respond with `{ wid: "", pushname: "" }`

### Requirement: Content script relays profile request

The content script SHALL forward `CHAMALEAD_PAGE_GET_PROFILE` messages to the page bridge and return the response.

#### Scenario: Successful relay

- **WHEN** the content script receives a `CHAMALEAD_GET_PROFILE` message from the background
- **THEN** it SHALL post `CHAMALEAD_PAGE_GET_PROFILE` to the page, await the response, and send it back

### Requirement: Background caches profile WID at campaign start

The background service worker SHALL fetch the profile WID when a campaign starts and cache it for the duration of the campaign.

#### Scenario: Campaign start with available WID

- **WHEN** a `CHAMALEAD_BULK_SEND_START` message is received and WhatsApp is available
- **THEN** the background SHALL request the profile WID and store it for use in audit records

#### Scenario: Campaign start without available WID

- **WHEN** a `CHAMALEAD_BULK_SEND_START` message is received but the profile WID cannot be obtained (error or timeout)
- **THEN** the background SHALL use `"unknown"` as the profile WID and proceed with the campaign normally
