## Why

Bulk text campaigns currently send the same message to every contact, even when the imported CSV already contains useful per-contact context such as name, company, city, or other custom fields. Allowing CSV columns to be used as message variables makes campaigns more personal while keeping a safe fallback path when a row lacks required data.

## What Changes

- Add CSV-based message variables for text campaigns using placeholders that reference CSV column headers.
- Preserve CSV row context for each imported recipient instead of flattening the import into only a comma-separated phone list.
- Add one fallback text message for recipients whose row is missing any placeholder value required by the main message.
- Validate variable usage before starting a campaign so unavailable CSV columns and missing fallback requirements are surfaced early.
- Keep manual number entry and audio campaigns working without requiring CSV variables.

## Capabilities

### New Capabilities
- `csv-message-personalization`: Covers CSV column placeholders in bulk text messages, per-recipient rendering, fallback behavior, and validation rules.

### Modified Capabilities

None.

## Impact

- Affects `src/features/whatsapp/BulkSendForm.tsx` for CSV import state, variable UI, fallback input, validation, and preview.
- Affects `src/features/whatsapp/useBulkSend.ts` for starting text campaigns with optional structured CSV recipients and fallback message data.
- Affects `src/extension/background.ts` for persisted bulk send state, per-recipient message rendering, fallback selection, pause/resume continuity, and logs.
- Does not require new runtime dependencies.
- Requires version increment and validation with `npm run lint` and `npm run build` during implementation.
