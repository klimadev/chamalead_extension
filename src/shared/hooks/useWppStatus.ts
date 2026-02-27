import { useEffect, useState } from 'react'

export interface WppStatus {
  isReady: boolean
  isAuthenticated: boolean
}

export function useWppStatus() {
  const [status, setStatus] = useState<WppStatus>({
    isReady: false,
    isAuthenticated: false,
  })

  useEffect(() => {
    const checkStatus = async () => {
      console.log('[ChamaLead:hook] Checking WPP status...')

      try {
        const tabs = await chrome.tabs.query({ currentWindow: true })
        console.log('[ChamaLead:hook] All tabs:', tabs.map(t => ({ url: t.url, id: t.id })))

        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))
        console.log('[ChamaLead:hook] WhatsApp tab:', waTab)

        if (!waTab?.id) {
          console.log('[ChamaLead:hook] No WhatsApp tab found')
          setStatus({ isReady: false, isAuthenticated: false })
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
        })
      } catch (e) {
        console.error('[ChamaLead:hook] Error:', e)
        setStatus({ isReady: false, isAuthenticated: false })
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  return { status }
}
