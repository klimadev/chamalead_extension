## 1. Profile Identification (Page Bridge + Content Script)

- [x] 1.1 Add `CHAMALEAD_PAGE_GET_PROFILE` handler to `public/vendor/chamalead-page-bridge.js` that reads `WPP.conn.wid` and `pushname`
- [x] 1.2 Add relay for `CHAMALEAD_GET_PROFILE` → `CHAMALEAD_PAGE_GET_PROFILE` in `src/extension/content.ts`
- [x] 1.3 Add `getProfileWid()` function in `src/extension/background.ts` that fetches profile via content script
- [x] 1.4 Cache profile WID at campaign START and handle WID unavailable fallback

## 2. IndexedDB Setup

- [x] 2.1 Create `src/extension/db.ts` with IndexedDB open/create logic for `chamalead_history` database (object store `sends`, indexes `by_timestamp`, `by_profile`, `by_target`, `by_campaign`)
- [x] 2.2 Add `recordSend()` function to insert a `SendRecord` into IndexedDB
- [x] 2.3 Add `queryAnalytics(period)` function returning aggregated stats (today, week, total, hourly, recent campaigns)
- [x] 2.4 Add `clearHistory(before?)` function to delete records from IndexedDB
- [x] 2.5 Initialize database on service worker startup in `background.ts`

## 3. Send Audit Recording

- [x] 3.1 Generate `campaign_id` (UUID) at campaign start in `background.ts` `CHAMALEAD_BULK_SEND_START` handler
- [x] 3.2 Record send duration by capturing timestamp before/after each send attempt in `processNextNumber()`
- [x] 3.3 Call `recordSend()` after every send (success and failure) with full metadata: profile_wid, campaign_id, target, timestamp, success, error, duration, message_type, message_length, humanization config, campaign position
- [x] 3.4 Wrap `recordSend()` call in try/catch — audit failure MUST NOT block the campaign

## 4. Analytics Message Handlers

- [x] 4.1 Add `CHAMALEAD_ANALYTICS_GET` handler in `background.ts` that calls `queryAnalytics()` and returns the result
- [x] 4.2 Add `CHAMALEAD_ANALYTICS_CLEAR` handler in `background.ts` that calls `clearHistory()` and returns success/failure

## 5. Analytics UI Components

- [x] 5.1 Create `src/features/whatsapp/useAnalytics.ts` hook that polls analytics via `chrome.runtime.sendMessage({ type: 'CHAMALEAD_ANALYTICS_GET' })` on mount and every 5s while a campaign is active
- [x] 5.2 Create `src/features/whatsapp/AnalyticsDashboard.tsx` with SummaryCards (hoje/semana/total)
- [x] 5.3 Add hourly breakdown chart to AnalyticsDashboard (horizontal bars for each hour with send activity)
- [x] 5.4 Add recent campaigns list to AnalyticsDashboard (last 10, expandable to show individual sends)
- [x] 5.5 Add "Limpar historico" button with confirmation dialog to AnalyticsDashboard
- [x] 5.6 Add TypeScript types for `SendRecord`, `AnalyticsRequest`, `AnalyticsResponse` (in shared types or alongside components)

## 6. Popup Integration

- [x] 6.1 Integrate AnalyticsDashboard into `src/pages/popup/PopupPage.tsx` as a new navigation item ("Histórico")
- [x] 6.2 Ensure campaign status context is shared so AnalyticsDashboard knows when to poll

## 7. Version & Validation

- [x] 7.1 Increment version in `package.json` and `vite.config.ts`
- [x] 7.2 Run `npm run lint` and fix any issues
- [x] 7.3 Run `npm run build` and verify successful build
