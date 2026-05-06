## Context

Bulk text sending currently treats recipients as a comma-separated list of phone numbers and stores a single message for the whole campaign. CSV import is parsed in the popup, but after the phone column is imported the row data is discarded. The background worker persists only `numbers`, `message`, `messageType`, optional audio data, progress counters, logs, and `currentIndex`.

CSV personalization requires the text campaign path to carry row-level data through popup state, runtime messaging, persisted background state, and per-recipient sending. The existing pause/resume flow depends on `currentIndex`, so any recipient data used for rendering must be persisted with the campaign state.

## Goals / Non-Goals

**Goals:**

- Allow bulk text messages to reference CSV columns with placeholders such as `{{nome}}` or `{{empresa}}`.
- Render the message independently for each CSV recipient using that recipient's row values.
- Send a single fallback message when any placeholder required by the main message is missing or blank for a recipient.
- Validate unknown placeholders and fallback requirements before starting a campaign.
- Preserve existing manual number entry, pause/resume, progress, logs, and audio campaign behavior.

**Non-Goals:**

- Supporting conditional logic, filters, loops, expressions, or formatting functions inside templates.
- Supporting per-variable fallback text.
- Personalizing audio campaigns.
- Persisting uploaded CSV files outside the active campaign state.
- Adding external CSV or template-rendering dependencies.

## Decisions

### Use exact CSV headers as placeholder names

Placeholders will use the syntax `{{Header Name}}`, matching the parsed CSV header text after trimming the placeholder name. This avoids hidden normalization rules and makes the variable list shown in the UI match what users can paste into the message.

Alternatives considered:
- Normalize headers to `snake_case`: cleaner tokens, but creates ambiguity when users compare the token to the CSV header.
- Require users to map friendly variable names manually: more flexible, but too much UI and state for the first version.

### Store structured recipients for CSV-personalized text campaigns

When a CSV import is used for text personalization, the popup will send an array of recipients shaped around `phone` and `variables` instead of only `numbersText`. The background state will persist this array so pause/resume can continue rendering messages after the popup closes.

Manual campaigns can continue using `numbersText` and the existing number parsing path. The background send loop should resolve the current phone from `recipients[currentIndex].phone` when structured recipients exist, otherwise from `numbers[currentIndex]`.

Alternatives considered:
- Pre-render every message in the popup and send only `{ phone, message }`: simple background logic, but loses the ability to change fallback/rendering behavior centrally and increases stored state size for long multi-part messages.
- Encode variables into the comma-separated numbers field: brittle and hard to validate.

### Treat missing, unknown, or blank values as fallback triggers

The renderer will extract placeholders from the main message. A placeholder is usable only when the recipient has a matching variable key and the value is non-empty after trimming. If any required placeholder fails this check for a recipient, the fallback message is sent instead of the main message.

Unknown placeholders that do not match any CSV header should block campaign start because they indicate a template mistake affecting every row.

Alternatives considered:
- Leave unknown placeholders unchanged in the outgoing message: dangerous because users may accidentally send raw `{{name}}` text.
- Skip recipients with missing values: safer than sending wrong text, but the requested behavior is a fallback message.

### Keep fallback as a whole-message replacement

The fallback is one complete text message. It is not a per-variable default. If a personalized message needs any missing variable, the entire fallback replaces it.

Alternatives considered:
- Per-variable fallback values: more flexible, but adds more UI complexity and harder mental model.
- Inline syntax such as `{{nome|cliente}}`: powerful, but outside the simple campaign authoring workflow.

### Preserve double-newline splitting after rendering

The background currently splits text messages by double newlines and sends each part separately. Rendering should happen before splitting so both personalized messages and fallback messages support the same multi-part behavior.

## Risks / Trade-offs

- [Risk] Large CSV imports increase persisted background state size when variables are stored for every recipient. → Mitigation: store only parsed row values needed for the campaign and keep the existing file size limit.
- [Risk] Exact header matching can surprise users when headers contain extra spaces or accents. → Mitigation: show copyable variable chips based on parsed headers and trim placeholder names inside braces.
- [Risk] Manual numbers do not have row variables. → Mitigation: only enable CSV variables when structured CSV recipients are present; block variable placeholders in manual-only sends unless a CSV context exists.
- [Risk] Fallback text can itself contain placeholders. → Mitigation: treat fallback as plain text for the first version, or validate it separately only if placeholder support is intentionally allowed there. The recommended first version treats fallback as plain text.
- [Risk] Existing paused state in storage from an older version will not include recipients. → Mitigation: keep the existing `numbers` path valid and make `recipients` optional.

## Migration Plan

- Add optional structured recipient fields to the bulk send message payload and stored state while keeping existing fields valid.
- Existing manual and audio campaign data should continue through the current `numbers` and `audioBase64` paths.
- If rollback is needed, campaigns started with structured recipients may not resume on an older version; users can cancel and restart the campaign.

## Open Questions

- Should fallback text be allowed to contain placeholders in a future version?
- Should the UI insert variables at the cursor position, or copy variable chips to the clipboard first?
- Should rows with invalid phone numbers be excluded from the recipient array before validation, matching current import behavior?
