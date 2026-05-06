## 1. Template And Data Model

- [x] 1.1 Define shared types for CSV personalized recipients, variable maps, and bulk send payload fields.
- [x] 1.2 Add utility logic to extract `{{placeholder}}` tokens from text messages.
- [x] 1.3 Add utility logic to render a message for one recipient and choose fallback when any required value is missing or blank.
- [x] 1.4 Preserve existing double-newline splitting by applying rendering before splitting text into send parts.

## 2. Popup CSV Workflow

- [x] 2.1 Keep CSV row data available after selecting the phone column instead of discarding it after import.
- [x] 2.2 Build structured recipients from valid CSV phone rows with per-row variables keyed by CSV headers.
- [x] 2.3 Show available CSV variable placeholders near the message editor for text campaigns.
- [x] 2.4 Add a fallback message input for text campaigns when CSV variables are available.
- [x] 2.5 Validate unknown placeholders and missing fallback text before allowing a personalized send to start.
- [x] 2.6 Add a preview that demonstrates the rendered main or fallback message for at least one CSV recipient.

## 3. Runtime Messaging And Background Send

- [x] 3.1 Extend `useBulkSend` so text campaigns can send optional structured recipients and fallback message data to the background worker.
- [x] 3.2 Extend background persisted bulk send state with optional structured recipients and fallback message fields while keeping existing number-only campaigns valid.
- [x] 3.3 Update the background send loop to resolve the current phone from structured recipients when present.
- [x] 3.4 Render the per-recipient text message in the background and send fallback when required variables are missing.
- [x] 3.5 Keep pause, resume, stop, progress counters, and logs working for structured recipient campaigns.

## 4. Compatibility And Validation

- [x] 4.1 Verify manual text campaigns without placeholders still start and send through the existing behavior.
- [x] 4.2 Verify audio campaigns do not require CSV variables or fallback text.
- [x] 4.3 Increment version in `package.json` and `vite.config.ts` according to project rules.
- [x] 4.4 Run `npm run lint` and fix any reported issues.
- [x] 4.5 Run `npm run build` and fix any reported issues.