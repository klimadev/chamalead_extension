console.log('[ChamaLead] Content script loaded, version: 0.1.12')
console.log('[ChamaLead] Current URL:', window.location.href)
console.log('[ChamaLead] Document readyState:', document.readyState)

const WA_JS_SCRIPT_PATH = 'vendor/wppconnect-wa.js'
const WA_JS_SCRIPT_ID = 'chamalead-wppconnect-wa-js'
const PAGE_BRIDGE_SCRIPT_PATH = 'vendor/chamalead-page-bridge.js'
const PAGE_BRIDGE_SCRIPT_ID = 'chamalead-page-bridge'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PAGE_BRIDGE_TIMEOUT_MS = 2500
const PAGE_STATUS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
const PAGE_STATUS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'
const PAGE_CHATS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_CHATS'
const PAGE_CHATS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_CHATS'
const PAGE_SEND_MESSAGE_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE'
const PAGE_SEND_MESSAGE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_RESULT'

let injectionAttempts = 0
let pageBridgeReady = false

function checkWppGlobal(): boolean {
  const wpp = (globalThis as unknown as Record<string, unknown>).WPP
  if (wpp) {
    console.info('[ChamaLead] WPP global detected:', typeof wpp)
    console.info('[ChamaLead] WPP.isReady:', (wpp as { isReady?: boolean }).isReady)
    return true
  }
  console.warn('[ChamaLead] WPP global not found')
  return false
}

function injectWaJs(): void {
  if (document.getElementById(WA_JS_SCRIPT_ID)) {
    console.info('[ChamaLead] WA-JS script tag already exists')
    return
  }

  injectionAttempts++
  console.info(`[ChamaLead] WA-JS injection attempt ${injectionAttempts}/${MAX_RETRIES}`)

  const script = document.createElement('script')
  script.id = WA_JS_SCRIPT_ID
  script.src = chrome.runtime.getURL(WA_JS_SCRIPT_PATH)
  script.type = 'text/javascript'
  script.onload = () => {
    console.info('[ChamaLead] WA-JS script loaded')

    if (checkWppGlobal()) {
      return
    }

    console.warn('[ChamaLead] WPP not available immediately, scheduling retry...')
    scheduleRetry()
  }
  script.onerror = () => {
    console.error('[ChamaLead] Failed to load WA-JS script')
    scheduleRetry()
  }

  const target = document.head ?? document.documentElement
  target.append(script)
  console.info('[ChamaLead] WA-JS script appended to DOM')
}

function injectPageBridge(): void {
  if (document.getElementById(PAGE_BRIDGE_SCRIPT_ID)) {
    pageBridgeReady = true
    return
  }

  const script = document.createElement('script')
  script.id = PAGE_BRIDGE_SCRIPT_ID
  script.src = chrome.runtime.getURL(PAGE_BRIDGE_SCRIPT_PATH)
  script.type = 'text/javascript'
  script.onload = () => {
    pageBridgeReady = true
    console.info('[ChamaLead] Page bridge script loaded')
  }
  script.onerror = () => {
    console.error('[ChamaLead] Failed to load page bridge script')
  }

  const target = document.head ?? document.documentElement
  target.append(script)
  console.info('[ChamaLead] Page bridge script appended to DOM')
}

function scheduleRetry(): void {
  if (injectionAttempts >= MAX_RETRIES) {
    console.error(`[ChamaLead] Max retries (${MAX_RETRIES}) reached, giving up`)
    return
  }

  console.info(`[ChamaLead] Retrying in ${RETRY_DELAY_MS}ms...`)
  window.setTimeout(() => {
    injectWaJs()
  }, RETRY_DELAY_MS)
}

function setupNavigationObserver(): void {
  let lastUrl = location.href

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      console.info('[ChamaLead] Navigation detected, resetting injection state')
      injectionAttempts = 0
      injectWaJs()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  console.info('[ChamaLead] Navigation observer set up')
}

function injectWaJsAfterFullLoad(): void {
  if (document.readyState === 'complete') {
    console.info('[ChamaLead] Page already fully loaded, injecting WA-JS now')
    injectPageBridge()
    injectWaJs()
    setupNavigationObserver()
    return
  }

  console.info('[ChamaLead] Waiting for full page load before WA-JS injection')
  window.addEventListener(
    'load',
    () => {
      console.info('[ChamaLead] Full page load event received, injecting WA-JS now')
      injectPageBridge()
      injectWaJs()
      setupNavigationObserver()
    },
    { once: true },
  )
}

void chrome.runtime.sendMessage({ type: 'CHAMALEAD_HEALTHCHECK' })
injectWaJsAfterFullLoad()

console.log('[ChamaLead] Setting up message listener for CHAMALEAD_GET_WPP_STATUS')

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CHAMALEAD_GET_WPP_STATUS' || message?.type === 'CHAMALEAD_GET_WPP_CHATS') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const isChatsRequest = message?.type === 'CHAMALEAD_GET_WPP_CHATS'
    const pageRequestType = isChatsRequest ? PAGE_CHATS_REQUEST_TYPE : PAGE_STATUS_REQUEST_TYPE
    const pageResponseType = isChatsRequest ? PAGE_CHATS_RESPONSE_TYPE : PAGE_STATUS_RESPONSE_TYPE

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onPageResponse)
      sendResponse(
        isChatsRequest
          ? { chats: [], total: 0, limitedTo: 100 }
          : { isReady: false, isAuthenticated: false },
      )
    }, PAGE_BRIDGE_TIMEOUT_MS)

    function onPageResponse(event: MessageEvent): void {
      if (event.source !== window) {
        return
      }

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== pageResponseType || data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onPageResponse)

      if (isChatsRequest) {
        const chats = Array.isArray(data.chats) ? data.chats : []
        const total = typeof data.total === 'number' ? data.total : chats.length
        const limitedTo = typeof data.limitedTo === 'number' ? data.limitedTo : 100

        console.log('[ChamaLead:content] Chats response', {
          total,
          limited: chats.length,
          sample: chats[0] ?? null,
        })

        sendResponse({ chats, total, limitedTo })
        return
      }

      sendResponse({
        isReady: data.isReady === true,
        isAuthenticated: data.isAuthenticated === true,
      })
    }

    window.addEventListener('message', onPageResponse)
    window.postMessage({ type: pageRequestType, requestId }, '*')

    return true
  }

  if (message?.type === 'CHAMALEAD_SEND_MESSAGE') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const phoneNumber = message.phoneNumber
    const messageText = message.message

    if (!phoneNumber || !messageText) {
      sendResponse({ success: false, error: 'Missing phoneNumber or message' })
      return true
    }

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onSendResponse)
      sendResponse({ success: false, error: 'Timeout' })
    }, PAGE_BRIDGE_TIMEOUT_MS)

    function onSendResponse(event: MessageEvent): void {
      if (event.source !== window) {
        return
      }

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_SEND_MESSAGE_RESPONSE_TYPE || data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onSendResponse)

      console.log('[ChamaLead:content] Send message response', data)
      sendResponse({
        success: data.success === true,
        error: data.error,
      })
    }

    window.addEventListener('message', onSendResponse)
    window.postMessage({
      type: PAGE_SEND_MESSAGE_REQUEST_TYPE,
      requestId,
      phoneNumber,
      message: messageText,
    }, '*')

    return true
  }
})
