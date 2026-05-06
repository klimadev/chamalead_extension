import { useEffect, useState } from 'react'

export interface WppStatus {
  isReady: boolean
  isAuthenticated: boolean
  isLoading: boolean
}

export function useWppStatus() {
  const [status, setStatus] = useState<WppStatus>({
    isReady: false,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const checkStatus = async () => {
      console.log('[ChamaLead:hook] Checking WPP status...')

      try {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        console.log(
          '[ChamaLead:hook] All tabs:',
          tabs.map((tab) => ({ url: tab.url, id: tab.id })),
        )

        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))
        console.log('[ChamaLead:hook] WhatsApp tab:', waTab)

        if (!waTab?.id) {
          console.log('[ChamaLead:hook] No WhatsApp tab found')
          setStatus({ isReady: false, isAuthenticated: false, isLoading: false })
          return
        }

        console.log('[ChamaLead:hook] Sending message to tab:', waTab.id)
        const response = await chrome.tabs.sendMessage(waTab.id, {
          type: 'CHAMALEAD_GET_WPP_STATUS',
        })
        console.log('[ChamaLead:hook] Response:', response)

        setStatus({
          isReady: response?.isReady ?? false,
          isAuthenticated: response?.isAuthenticated ?? false,
          isLoading: false,
        })
      } catch (error) {
        console.error('[ChamaLead:hook] Error:', error)
        setStatus({ isReady: false, isAuthenticated: false, isLoading: false })
      }
    }

    void checkStatus()
    const interval = window.setInterval(() => {
      void checkStatus()
    }, 2000)

    return () => window.clearInterval(interval)
  }, [])

  return { status }
}
