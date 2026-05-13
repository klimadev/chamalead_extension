## Context

Extension uses a Page Bridge Pattern: popup → content script → page bridge (MAIN world) → `globalThis.WPP`. The existing page bridge handles WPP_STATUS, WPP_CHATS, SEND_MESSAGE, and SEND_AUDIO via `window.postMessage` with `requestId` correlation and timeouts.

This feature adds group contact extraction — a read-only workflow that lists WhatsApp groups, lets users select them, fetches participants, and generates a CSV download. No writes to WhatsApp state. Follows the same bridge pattern as existing requests.

## Goals / Non-Goals

**Goals:**
- List all WhatsApp groups with checkboxes in the popup
- Extract participants from selected groups using `WPP.group.getParticipants()`
- Generate CSV with columns: `group_name`, `phone`, `is_admin`
- Skip participants with `@lid` IDs (system/internal IDs, not real contacts)
- Download CSV file in the browser
- Work only on `web.whatsapp.com`

**Non-Goals:**
- Contact name enrichment (no `WPP.contact.get()` calls)
- CRM integration or external API upload
- Periodic/automatic extraction
- Extraction from non-group chats
- Support for Instagram or other sites

## Decisions

### 1. Two separate bridge requests: GET_GROUPS + GET_PARTICIPANTS

**Chosen:** Two new message types: `CHAMALEAD_GET_WPP_GROUPS` and `CHAMALEAD_GET_WPP_PARTICIPANTS`.

**Rationale:** Listing groups is fast (existing `WPP.chat.list` gives us `chat.isGroup` filter). Getting participants is slower, especially for large groups. Separating them allows the UI to show the group list immediately, then fetch participants only for selected groups on demand. This avoids a single long operation.

**Alternative considered:** Single "extract all" request — rejected because user needs control over which groups to extract.

### 2. Fetch groups from existing chat list, not WPP.group.getAllGroups()

**Chosen:** Reuse the existing `WPP.chat.list()` call — the hook `useWppChats` already fetches all chats with `isGroup` flag. Add a `CHAMALEAD_GET_WPP_GROUPS` message type that filters the chat list to groups only.

**Rationale:** `WPP.chat.list()` is already loaded in memory. No need for a separate `WPP.group.getAllGroups()` call that may trigger network re-fetch. Filter `chat.isGroup === true` from the existing chat list.

**Alternative considered:** Call `WPP.group.getAllGroups()` directly — rejected because the chat list already contains groups and is maintained by the polling hook.

### 3. Participant extraction: call WPP.group.getParticipants() in page bridge

**Chosen:** Bridge handler calls `WPP.group.getParticipants(groupId)`, transforms results, returns plain data.

**Rationale:** `WPP.group.getParticipants()` is an async method that needs to run in MAIN world. The bridge normalizes the output, stripping WPP model objects to plain JSON with only the needed fields.

### 4. CSV generation client-side (React component)

**Chosen:** Build CSV string in the React component using `join(',')` and `map()`. Trigger download via `URL.createObjectURL` + `<a>` click.

**Rationale:** No server, no need for a library. CSV format is trivial: three columns with no special escaping needed (phone numbers and group names are safe). Keeps dependencies zero.

### 5. Extraction triggered per group, sequentially

**Chosen:** User clicks "Extrair" → for each selected group, call `getParticipants()` → accumulate rows → generate final CSV.

**Rationale:** Simpler than batching. WhatsApp groups typically have < 500 members. Even 10 groups × 500 participants = 5000 rows, which is manageable. Timeout per group is the existing `PAGE_BRIDGE_TIMEOUT_MS` (2500ms). If a group times out, skip it and continue.

### 6. New "group-extraction" view in popup router

**Chosen:** Add `group-extraction` to the `AppView` type in `PopupPage.tsx`. HomeDashboard gets a new card "Extrair Contatos". Separate from CampaignWizard.

**Rationale:** Per user decision — not part of campaign flow. Standalone tool.

## Risks / Trade-offs

- **[Large groups may timeout]** → If `getParticipants()` takes > 2.5s (very large groups), the group is silently skipped. The extracted CSV shows only successful groups. Future: increase timeout or batch.
- **[@lid filtering is string-based]** → Checks if participant `id._serialized` contains `@lid`. Relies on WhatsApp's ID format convention. If format changes, filter may miss new types.
- **[Phone numbers from ID only]** → Phone is `id.replace('@c.us', '')`. No validation that it's a valid phone number. Edge case: non-numeric IDs (e.g., broadcast lists) — these are already filtered by `isGroup`.
- **[CSV encoding edge cases]** → Group names may contain commas or quotes. Sanitize by wrapping in double quotes and escaping internal quotes.

## Open Questions

- None. All decisions resolved above.
