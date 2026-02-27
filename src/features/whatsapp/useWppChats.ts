import { useEffect, useMemo, useState } from 'react'

import { type WppStatus } from './useWppStatus'

export interface WppChat {
  id: string
  name: string
  isGroup: boolean
  isNewsletter: boolean
  lastMessage: string
  unreadCount: number
}

interface WppChatsState {
  chats: WppChat[]
  total: number
  limitedTo: number
  error: string | null
  lastUpdatedAt: number | null
  isLoaded: boolean
}

const CHATS_POLL_INTERVAL_MS = 5000

export function useWppChats(status: WppStatus) {
  const [state, setState] = useState<WppChatsState>({
    chats: [],
    total: 0,
    limitedTo: 100,
    error: null,
    lastUpdatedAt: null,
    isLoaded: false,
  })

  const canFetchChats = useMemo(
    () => status.isReady && status.isAuthenticated,
    [status.isReady, status.isAuthenticated],
  )

  useEffect(() => {
    if (!canFetchChats) {
      return
    }

    const fetchChats = async () => {
      try {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))

        if (!waTab?.id) {
          return
        }

        const response = await chrome.tabs.sendMessage(waTab.id, {
          type: 'CHAMALEAD_GET_WPP_CHATS',
        })

        const chats = Array.isArray(response?.chats)
          ? (response.chats as WppChat[])
          : []
        const total = typeof response?.total === 'number' ? response.total : chats.length
        const limitedTo = typeof response?.limitedTo === 'number' ? response.limitedTo : 100

        console.log('[ChamaLead:hook] Chats fetched', {
          total,
          limited: chats.length,
          sample: chats[0] ?? null,
        })

        setState({
          chats,
          total,
          limitedTo,
          error: null,
          lastUpdatedAt: Date.now(),
          isLoaded: true,
        })
      } catch (error) {
        console.error('[ChamaLead:hook] Failed to fetch chats', error)
      }
    }

    void fetchChats()
    const intervalId = window.setInterval(() => {
      void fetchChats()
    }, CHATS_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [canFetchChats])

  if (!canFetchChats) {
    return {
      chats: [],
      total: 0,
      limitedTo: 100,
      error: null,
      lastUpdatedAt: null,
    }
  }

  return {
    chats: state.isLoaded ? state.chats : [],
    total: state.isLoaded ? state.total : 0,
    limitedTo: state.limitedTo,
    error: state.error,
    lastUpdatedAt: state.lastUpdatedAt,
  }
}
