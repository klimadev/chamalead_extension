import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsResponse } from '@/extension/db'

export function useAnalytics(campaignActive: boolean): {
  analytics: AnalyticsResponse
  loading: boolean
  refresh: () => void
  clear: () => Promise<boolean>
} {
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({
    summary: {
      today: { sent: 0, failed: 0 },
      week: { sent: 0, failed: 0 },
      total: { sent: 0, failed: 0 },
    },
    hourly: [],
    recent_campaigns: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_ANALYTICS_GET' }, (response) => {
      if (response && response.summary) {
        setAnalytics(response as AnalyticsResponse)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  useEffect(() => {
    if (!campaignActive) return

    const id = setInterval(fetchAnalytics, 5000)
    return () => clearInterval(id)
  }, [campaignActive, fetchAnalytics])

  const clear = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CHAMALEAD_ANALYTICS_CLEAR' }, (response) => {
        if (response?.success) {
          fetchAnalytics()
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }, [fetchAnalytics])

  return { analytics, loading, refresh: fetchAnalytics, clear }
}
