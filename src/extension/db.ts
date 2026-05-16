const DB_NAME = 'chamalead_history'
const DB_VERSION = 1
const STORE_NAME = 'sends'

export interface SendRecord {
  id: string
  campaign_id: string
  profile_wid: string
  target_phone: string
  timestamp: number
  success: boolean
  error_message?: string
  duration_ms: number
  message_type: 'text' | 'audio'
  message_length: number
  humanization_profile?: string
  humanization_min_delay?: number
  humanization_max_delay?: number
  campaign_total: number
  campaign_position: number
}

export interface AnalyticsSummary {
  sent: number
  failed: number
}

export interface HourlyBucket {
  hour: number
  sent: number
  failed: number
}

export interface CampaignSummary {
  campaign_id: string
  started_at: number
  total: number
  sent: number
  failed: number
  profile_wid: string
  humanization_profile?: string
}

export interface AnalyticsResponse {
  summary: {
    today: AnalyticsSummary
    week: AnalyticsSummary
    total: AnalyticsSummary
  }
  hourly: HourlyBucket[]
  recent_campaigns: CampaignSummary[]
}

let db: IDBDatabase | null = null

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('by_timestamp', 'timestamp', { unique: false })
        store.createIndex('by_profile', 'profile_wid', { unique: false })
        store.createIndex('by_target', 'target_phone', { unique: false })
        store.createIndex('by_campaign', 'campaign_id', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      resolve(db)
    }

    request.onerror = (event) => {
      console.error('[ChamaLead:db] Failed to open database:', (event.target as IDBOpenDBRequest).error)
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

export async function recordSend(record: SendRecord): Promise<void> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.add(record)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => {
        console.error('[ChamaLead:db] Failed to record send:', transaction.error)
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.error('[ChamaLead:db] recordSend error:', error)
  }
}

function getTodayRange(): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return [start, end]
}

function getWeekRange(): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime()
  const end = Date.now() + 1
  return [start, end]
}

function getAllSends(database: IDBDatabase): Promise<SendRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as SendRecord[])
    request.onerror = () => reject(request.error)
  })
}

function getSendsInRange(database: IDBDatabase, start: number, end: number): Promise<SendRecord[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('by_timestamp')
    const range = IDBKeyRange.bound(start, end, false, true)
    const request = index.getAll(range)

    request.onsuccess = () => resolve(request.result as SendRecord[])
    request.onerror = () => reject(request.error)
  })
}

function aggregateSends(sends: SendRecord[]): AnalyticsSummary {
  let sent = 0
  let failed = 0
  for (const s of sends) {
    if (s.success) sent++
    else failed++
  }
  return { sent, failed }
}

function buildHourly(sends: SendRecord[]): HourlyBucket[] {
  const buckets = new Map<number, { sent: number; failed: number }>()
  for (const s of sends) {
    const hour = new Date(s.timestamp).getHours()
    const entry = buckets.get(hour) || { sent: 0, failed: 0 }
    if (s.success) entry.sent++
    else entry.failed++
    buckets.set(hour, entry)
  }

  const result: HourlyBucket[] = []
  for (const [hour, counts] of buckets) {
    result.push({ hour, sent: counts.sent, failed: counts.failed })
  }
  result.sort((a, b) => a.hour - b.hour)
  return result
}

function buildCampaigns(sends: SendRecord[]): CampaignSummary[] {
  const campaigns = new Map<string, CampaignSummary & { sends: SendRecord[] }>()

  for (const s of sends) {
    const existing = campaigns.get(s.campaign_id)
    if (existing) {
      existing.sends.push(s)
      existing.total = Math.max(existing.total, s.campaign_total)
      existing.sent += s.success ? 1 : 0
      existing.failed += s.success ? 0 : 1
      if (s.timestamp < existing.started_at) existing.started_at = s.timestamp
      if (s.humanization_profile) existing.humanization_profile = s.humanization_profile
    } else {
      campaigns.set(s.campaign_id, {
        campaign_id: s.campaign_id,
        started_at: s.timestamp,
        total: s.campaign_total,
        sent: s.success ? 1 : 0,
        failed: s.success ? 0 : 1,
        profile_wid: s.profile_wid,
        humanization_profile: s.humanization_profile,
        sends: [s],
      })
    }
  }

  const result: CampaignSummary[] = []
  for (const c of campaigns.values()) {
    result.push({
      campaign_id: c.campaign_id,
      started_at: c.started_at,
      total: c.total,
      sent: c.sent,
      failed: c.failed,
      profile_wid: c.profile_wid,
      humanization_profile: c.humanization_profile,
    })
  }
  result.sort((a, b) => b.started_at - a.started_at)
  return result.slice(0, 10)
}

export async function queryAnalytics(): Promise<AnalyticsResponse> {
  try {
    const database = await openDatabase()
    const [todayRangeStart, todayRangeEnd] = getTodayRange()
    const [weekRangeStart, weekRangeEnd] = getWeekRange()

    const [todaySends, weekSends, allSends] = await Promise.all([
      getSendsInRange(database, todayRangeStart, todayRangeEnd),
      getSendsInRange(database, weekRangeStart, weekRangeEnd),
      getAllSends(database),
    ])

    return {
      summary: {
        today: aggregateSends(todaySends),
        week: aggregateSends(weekSends),
        total: aggregateSends(allSends),
      },
      hourly: buildHourly(todaySends),
      recent_campaigns: buildCampaigns(allSends),
    }
  } catch (error) {
    console.error('[ChamaLead:db] queryAnalytics error:', error)
    return {
      summary: {
        today: { sent: 0, failed: 0 },
        week: { sent: 0, failed: 0 },
        total: { sent: 0, failed: 0 },
      },
      hourly: [],
      recent_campaigns: [],
    }
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.clear()

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => {
        console.error('[ChamaLead:db] Failed to clear history:', transaction.error)
        reject(transaction.error)
      }
    })
  } catch (error) {
    console.error('[ChamaLead:db] clearHistory error:', error)
  }
}
