console.log('[ChamaLead] Content script loaded, version: 0.1.49')
console.log('[ChamaLead] Current URL:', window.location.href)
console.log('[ChamaLead] Document readyState:', document.readyState)

const INSTAGRAM_SITE_HOST = 'www.instagram.com'
const WHATSAPP_SITE_HOST = 'web.whatsapp.com'
const WA_JS_SCRIPT_PATH = 'vendor/wppconnect-wa.js'
const WA_JS_SCRIPT_ID = 'chamalead-wppconnect-wa-js'
const PAGE_BRIDGE_SCRIPT_PATH = 'vendor/chamalead-page-bridge.js'
const PAGE_BRIDGE_SCRIPT_ID = 'chamalead-page-bridge'
const INSTAGRAM_PAGE_BRIDGE_SCRIPT_PATH = 'vendor/chamalead-instagram-page-bridge.js'
const INSTAGRAM_PAGE_BRIDGE_SCRIPT_ID = 'chamalead-instagram-page-bridge'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PAGE_BRIDGE_TIMEOUT_MS = 2500
const PAGE_INSTAGRAM_TIMEOUT_MS = 5000
const PAGE_STATUS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_STATUS'
const PAGE_STATUS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_STATUS'
const PAGE_CHATS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_CHATS'
const PAGE_CHATS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_CHATS'
const PAGE_SEND_MESSAGE_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE'
const PAGE_SEND_MESSAGE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_RESULT'
const PAGE_SEND_AUDIO_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO'
const PAGE_SEND_AUDIO_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO_RESULT'
const PAGE_INSTAGRAM_PROFILE_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_IG_PROFILE'
const PAGE_INSTAGRAM_PROFILE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_IG_PROFILE_RESULT'
const PAGE_AUDIO_TIMEOUT_MS = 30000

let injectionAttempts = 0
let pageBridgeReady = false
let instagramPageBridgeReady = false

function getCurrentSiteHost(): string {
  return window.location.hostname
}

function isWhatsAppSite(): boolean {
  return getCurrentSiteHost() === WHATSAPP_SITE_HOST
}

function isInstagramSite(): boolean {
  return getCurrentSiteHost() === INSTAGRAM_SITE_HOST
}

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

function injectInstagramPageBridge(): void {
  if (document.getElementById(INSTAGRAM_PAGE_BRIDGE_SCRIPT_ID)) {
    instagramPageBridgeReady = true
    return
  }

  const script = document.createElement('script')
  script.id = INSTAGRAM_PAGE_BRIDGE_SCRIPT_ID
  script.src = chrome.runtime.getURL(INSTAGRAM_PAGE_BRIDGE_SCRIPT_PATH)
  script.type = 'text/javascript'
  script.onload = () => {
    instagramPageBridgeReady = true
    console.info('[ChamaLead] Instagram page bridge script loaded')
  }
  script.onerror = () => {
    console.error('[ChamaLead] Failed to load Instagram page bridge script')
  }

  const target = document.head ?? document.documentElement
  target.append(script)
  console.info('[ChamaLead] Instagram page bridge script appended to DOM')
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

function setupNavigationObserver(onUrlChange: () => void): void {
  let lastUrl = location.href

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      console.info('[ChamaLead] Navigation detected, resetting injection state')
      onUrlChange()
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  console.info('[ChamaLead] Navigation observer set up')
}

function injectWhatsAppScriptsAfterFullLoad(): void {
  if (document.readyState === 'complete') {
    console.info('[ChamaLead] Page already fully loaded, injecting WA-JS now')
    injectPageBridge()
    injectWaJs()
    setupNavigationObserver(() => {
      injectionAttempts = 0
      injectPageBridge()
      injectWaJs()
    })
    return
  }

  console.info('[ChamaLead] Waiting for full page load before WA-JS injection')
  window.addEventListener(
    'load',
    () => {
      console.info('[ChamaLead] Full page load event received, injecting WA-JS now')
      injectPageBridge()
      injectWaJs()
      setupNavigationObserver(() => {
        injectionAttempts = 0
        injectPageBridge()
        injectWaJs()
      })
    },
    { once: true },
  )
}

function injectInstagramScriptsAfterFullLoad(): void {
  if (document.readyState === 'complete') {
    console.info('[ChamaLead] Page already fully loaded, injecting Instagram bridge now')
    injectInstagramPageBridge()
    setupNavigationObserver(() => {
      injectInstagramPageBridge()
    })
    return
  }

  console.info('[ChamaLead] Waiting for full page load before Instagram bridge injection')
  window.addEventListener(
    'load',
    () => {
      console.info('[ChamaLead] Full page load event received, injecting Instagram bridge now')
      injectInstagramPageBridge()
      setupNavigationObserver(() => {
        injectInstagramPageBridge()
      })
    },
    { once: true },
  )
}

void chrome.runtime.sendMessage({ type: 'CHAMALEAD_HEALTHCHECK' })
if (isWhatsAppSite()) {
  injectWhatsAppScriptsAfterFullLoad()
} else if (isInstagramSite()) {
  injectInstagramScriptsAfterFullLoad()
}

console.log('[ChamaLead] Setting up message listener for site requests')

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isWhatsAppSite() && (message?.type === 'CHAMALEAD_GET_WPP_STATUS' || message?.type === 'CHAMALEAD_GET_WPP_CHATS')) {
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

  if (isInstagramSite() && message?.type === 'CHAMALEAD_GET_IG_PROFILE') {
    if (!instagramPageBridgeReady) {
      injectInstagramPageBridge()
    }

    const profileUsername = message.username
    const requestId = crypto.randomUUID()

    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onProfileResponse)
      sendResponse({
        success: false,
        error: {
          code: 'network_error',
          message: 'Tempo esgotado ao consultar o Instagram.',
        },
      })
    }, PAGE_INSTAGRAM_TIMEOUT_MS)

    function onProfileResponse(event: MessageEvent): void {
      if (event.source !== window) {
        return
      }

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_INSTAGRAM_PROFILE_RESPONSE_TYPE || data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onProfileResponse)

      sendResponse({
        success: data.success === true,
        profile: data.profile ?? null,
        error: data.error ?? null,
      })
    }

    window.addEventListener('message', onProfileResponse)
    window.postMessage({
      type: PAGE_INSTAGRAM_PROFILE_REQUEST_TYPE,
      requestId,
      username: profileUsername,
    }, '*')

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

  if (message?.type === 'CHAMALEAD_SEND_AUDIO') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const phoneNumber = message.phoneNumber
    const audioBase64 = message.audioBase64

    if (!phoneNumber || !audioBase64) {
      sendResponse({ success: false, error: 'Missing phoneNumber or audioBase64' })
      return true
    }

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onSendAudioResponse)
      sendResponse({ success: false, error: 'Timeout' })
    }, PAGE_AUDIO_TIMEOUT_MS)

    function onSendAudioResponse(event: MessageEvent): void {
      if (event.source !== window) {
        return
      }

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_SEND_AUDIO_RESPONSE_TYPE || data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onSendAudioResponse)

      console.log('[ChamaLead:content] Send audio response', data)
      sendResponse({
        success: data.success === true,
        error: data.error,
      })
    }

    window.addEventListener('message', onSendAudioResponse)
    window.postMessage({
      type: PAGE_SEND_AUDIO_REQUEST_TYPE,
      requestId,
      phoneNumber,
      audioBase64,
    }, '*')

    return true
  }
})
