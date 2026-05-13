## ADDED Requirements

### Requirement: Page bridge executes humanized send pipeline
The page bridge SHALL execute a five-stage behavioral pipeline before sending each WhatsApp text message: open chat, read chat, simulate typing, send message, stop typing. Each stage is optional per the humanization config.

#### Scenario: Full humanized pipeline with all stages enabled
- **WHEN** content script sends `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED` with `{ humanization: { openChat: true, readChat: true, readCount: 3, simulateTyping: true } }`
- **THEN** page bridge SHALL call `WPP.chat.openChatBottom(chatId)` and delay 300-600ms
- **AND** SHALL call `WPP.chat.markIsRead(chatId)` then `WPP.chat.getMessages(chatId, { count: 3 })` and delay 400-900ms
- **AND** SHALL call `WPP.chat.markIsComposing(chatId)`, sleep for calculated typing duration, then call `WPP.chat.sendTextMessage(chatId, message)`
- **AND** SHALL call `WPP.chat.markIsPaused(chatId)` after sending
- **AND** SHALL respond with `{ success: true }` via `CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED_RESULT`

#### Scenario: Minimal pipeline with typing only
- **WHEN** config has `{ openChat: false, readChat: false, simulateTyping: true }`
- **THEN** page bridge SHALL skip openChat and readChat stages
- **AND** SHALL still execute typing → send → stop typing sequence

#### Scenario: markIsPaused guaranteed even on send failure
- **WHEN** `WPP.chat.sendTextMessage()` throws an error after `markIsComposing` was already called
- **THEN** page bridge SHALL call `WPP.chat.markIsPaused(chatId)` in a finally block
- **AND** SHALL respond with `{ success: false, error: '<error message>' }`

### Requirement: Variable typing duration proportional to message length
Typing duration SHALL be calculated as `message.length * typingSpeedMsPerChar * randomVariation(0.85, 1.15)` rounded to nearest integer.

#### Scenario: 100-character message at 150ms/char
- **WHEN** message length is 100 and `typingSpeedMs` is 150
- **THEN** typing duration SHALL be between 12750ms and 17250ms (100 × 150 × range 0.85-1.15)

#### Scenario: Empty message produces zero typing duration
- **WHEN** message is empty string or only whitespace
- **THEN** typing duration SHALL be 0ms

### Requirement: Random micro-delays between pipeline stages
After each behavioral stage (except the final one), the page bridge SHALL introduce a random micro-delay using `crypto.getRandomValues()`-based randomization to prevent timing fingerprinting.

#### Scenario: Micro-delay after openChat stage
- **WHEN** `openChat` is enabled
- **THEN** page bridge SHALL sleep for 300-600ms after `openChatBottom` completes

#### Scenario: Micro-delay after readChat stage
- **WHEN** `readChat` is enabled
- **THEN** page bridge SHALL sleep for 400-900ms after `getMessages` completes

### Requirement: Contact existence check before pipeline
Before executing the pipeline, the page bridge SHALL call `WPP.contact.queryWidExists(chatId)` to verify the contact exists on WhatsApp.

#### Scenario: Contact exists
- **WHEN** `queryWidExists` returns a non-null result
- **THEN** page bridge SHALL proceed with the humanized pipeline

#### Scenario: Contact does not exist
- **WHEN** `queryWidExists` returns null
- **THEN** page bridge SHALL respond with `{ success: false, error: 'Contact does not exist on WhatsApp' }` without attempting to send

### Requirement: Page bridge stays compatible with legacy non-humanized send
The existing `CHAMALEAD_PAGE_SEND_MESSAGE` handler SHALL remain unchanged and continue to call `WPP.chat.sendTextMessage()` directly without any behavioral stages.

#### Scenario: Legacy send still works
- **WHEN** content script sends `CHAMALEAD_PAGE_SEND_MESSAGE` with phoneNumber and message
- **THEN** page bridge SHALL call `WPP.chat.sendTextMessage()` directly with no humanization steps
- **AND** SHALL respond with `CHAMALEAD_PAGE_SEND_MESSAGE_RESULT` as before
