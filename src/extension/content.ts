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
const PAGE_SEND_MESSAGE_HUMANIZED_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED'
const PAGE_SEND_MESSAGE_HUMANIZED_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_MESSAGE_HUMANIZED_RESULT'
const PAGE_SEND_AUDIO_REQUEST_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO'
const PAGE_SEND_AUDIO_RESPONSE_TYPE = 'CHAMALEAD_PAGE_SEND_AUDIO_RESULT'
const PAGE_GROUPS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_GROUPS'
const PAGE_GROUPS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_GROUPS'
const PAGE_PARTICIPANTS_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_WPP_PARTICIPANTS'
const PAGE_PARTICIPANTS_RESPONSE_TYPE = 'CHAMALEAD_PAGE_WPP_PARTICIPANTS'
const PAGE_INSTAGRAM_PROFILE_REQUEST_TYPE = 'CHAMALEAD_PAGE_GET_IG_PROFILE'
const PAGE_INSTAGRAM_PROFILE_RESPONSE_TYPE = 'CHAMALEAD_PAGE_IG_PROFILE_RESULT'
const PAGE_PARTICIPANTS_TIMEOUT_MS = 15000
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

let fabElement: HTMLDivElement | null = null
let fabExpanded = false
let fabPollingId: ReturnType<typeof setInterval> | null = null
let fabAutoRemoveId: ReturnType<typeof setTimeout> | null = null

interface FabState {
  total: number
  sent: number
  failed: number
  status: string
}

function createFabOverlay(): void {
  if (fabElement) return

  fabElement = document.createElement('div')
  fabElement.id = 'chamalead-fab-overlay'
  fabElement.style.cssText = [
    'position: fixed',
    'bottom: 100px',
    'right: 20px',
    'z-index: 9999',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 14px',
    'cursor: pointer',
    'user-select: none',
    'transition: all 0.2s ease',
  ].join(';') + ';'

  fabElement.addEventListener('click', () => {
    fabExpanded = !fabExpanded
    const latest = latestFabState
    renderFabContent(fabElement!, latest)
  })

  document.body.appendChild(fabElement)
  renderFabContent(fabElement, null)
}

function getFabBackgroundColor(status: string): string {
  switch (status) {
    case 'sending': return '#3B82F6'
    case 'paused': return '#F59E0B'
    case 'completed': return '#10B981'
    case 'error': return '#EF4444'
    default: return '#6B7280'
  }
}

function renderFabContent(el: HTMLDivElement, state: FabState | null): void {
  if (!state || state.status === 'idle') {
    el.style.display = 'none'
    return
  }
  el.style.display = ''

  const color = getFabBackgroundColor(state.status)
  const percent = state.total > 0 ? Math.round(((state.sent + state.failed) / state.total) * 100) : 0
  const remainder = state.total - state.sent - state.failed

  if (!fabExpanded) {
    el.innerHTML = ''
    el.style.cssText += ';width:56px;height:56px;border-radius:50%'
    const circle = document.createElement('div')
    circle.style.cssText = [
      `background:${color}`,
      'width:100%',
      'height:100%',
      'border-radius:50%',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'color:#fff',
      'font-weight:700',
      'font-size:13px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
    ].join(';') + ';'
    circle.textContent = `${state.sent + state.failed}/${state.total}`
    el.appendChild(circle)
  } else {
    el.innerHTML = ''
    el.style.cssText += ';width:220px;padding:12px 16px;border-radius:12px'
    el.style.background = '#1F2937'
    el.style.color = '#F9FAFB'
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'
    header.innerHTML = `<span style="font-weight:700">📊 Campanha</span><span style="color:#9CA3AF;font-size:12px">${state.status}</span>`
    el.appendChild(header)

    const bar = document.createElement('div')
    bar.style.cssText = `height:6px;border-radius:3px;background:#374151;margin-bottom:8px;overflow:hidden`
    bar.innerHTML = `<div style="height:100%;width:${percent}%;background:${color};border-radius:3px;transition:width 0.3s"></div>`
    el.appendChild(bar)

    const stats = document.createElement('div')
    stats.style.cssText = 'display:flex;gap:12px;font-size:12px;margin-bottom:4px'
    stats.innerHTML = `<span>✅ ${state.sent}</span><span>❌ ${state.failed}</span><span>⏳ ${remainder}</span>`
    el.appendChild(stats)

    const link = document.createElement('div')
    link.style.cssText = 'font-size:11px;color:#9CA3AF;margin-top:4px'
    link.textContent = 'Gerencie na extensao'
    el.appendChild(link)
  }
}

let latestFabState: FabState | null = null

function updateFabOverlay(stateData: FabState | null): void {
  latestFabState = stateData
  if (!fabElement) {
    if (stateData && stateData.status !== 'idle' && stateData.status !== 'completed' && stateData.status !== 'error') {
      createFabOverlay()
    }
    return
  }
  if (!stateData || stateData.status === 'idle') {
    fabElement.style.display = 'none'
    return
  }
  renderFabContent(fabElement, stateData)
}

function removeFabOverlay(): void {
  if (fabPollingId) {
    clearInterval(fabPollingId)
    fabPollingId = null
  }
  if (fabAutoRemoveId) {
    clearTimeout(fabAutoRemoveId)
    fabAutoRemoveId = null
  }
  if (fabElement) {
    fabElement.remove()
    fabElement = null
  }
  fabExpanded = false
  latestFabState = null
}

function startFabPolling(): void {
  if (fabPollingId) return
  fabPollingId = setInterval(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHAMALEAD_BULK_SEND_GET_STATE' })
      const state: FabState | null = response && response.status !== 'idle' ? response as FabState : null
      updateFabOverlay(state)
      if (state && (state.status === 'completed' || state.status === 'error')) {
        if (!fabAutoRemoveId) {
          fabAutoRemoveId = setTimeout(() => {
            removeFabOverlay()
          }, 30000)
        }
      }
    } catch {
      // Background may not be ready
    }
  }, 2000)
}

function restoreFabFromExistingCampaign(): void {
  chrome.runtime.sendMessage({ type: 'CHAMALEAD_BULK_SEND_GET_STATE' }, (response) => {
    const state = response && response.status !== 'idle' ? response as FabState : null
    if (state && state.status === 'sending') {
      updateFabOverlay(state)
      startFabPolling()
    }
  })
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
      restoreFabFromExistingCampaign()
    })
    restoreFabFromExistingCampaign()
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
        restoreFabFromExistingCampaign()
      })
      restoreFabFromExistingCampaign()
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

  if (isWhatsAppSite() && message?.type === 'CHAMALEAD_GET_WPP_GROUPS') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onResponse)
      sendResponse({ groups: [] })
    }, PAGE_BRIDGE_TIMEOUT_MS)

    function onResponse(event: MessageEvent): void {
      if (event.source !== window) return

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_GROUPS_RESPONSE_TYPE || data.requestId !== requestId) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onResponse)

      const groups = Array.isArray(data.groups) ? data.groups : []
      sendResponse({ groups })
    }

    window.addEventListener('message', onResponse)
    window.postMessage({ type: PAGE_GROUPS_REQUEST_TYPE, requestId }, '*')

    return true
  }

  if (isWhatsAppSite() && message?.type === 'CHAMALEAD_GET_WPP_PARTICIPANTS') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const groupId = message.groupId
    if (!groupId) {
      sendResponse({ participants: [], error: 'Missing groupId' })
      return true
    }

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onResponse)
      sendResponse({ participants: [], error: 'Tempo esgotado ao carregar participantes' })
    }, PAGE_PARTICIPANTS_TIMEOUT_MS)

    function onResponse(event: MessageEvent): void {
      if (event.source !== window) return

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_PARTICIPANTS_RESPONSE_TYPE || data.requestId !== requestId) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onResponse)

      const participants = Array.isArray(data.participants) ? data.participants : []
      sendResponse({ participants, error: data.error ?? null })
    }

    window.addEventListener('message', onResponse)
    window.postMessage({ type: PAGE_PARTICIPANTS_REQUEST_TYPE, requestId, groupId }, '*')

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

  if (message?.type === 'CHAMALEAD_SEND_MESSAGE_HUMANIZED') {
    if (!pageBridgeReady) {
      injectPageBridge()
    }

    const phoneNumber = message.phoneNumber
    const messageText = message.message
    const humanizationConfig = message.humanizationConfig
    const estimatedDurationMs = typeof message.estimatedDurationMs === 'number' ? message.estimatedDurationMs : 60000

    if (!phoneNumber || !messageText) {
      sendResponse({ success: false, error: 'Missing phoneNumber or message' })
      return true
    }

    const cappedTimeout = Math.min(Math.round(estimatedDurationMs * 1.5), 300000)

    const requestId = crypto.randomUUID()
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', onSendResponse)
      sendResponse({ success: false, error: 'Timeout (humanized)' })
    }, cappedTimeout)

    function onSendResponse(event: MessageEvent): void {
      if (event.source !== window) return

      const data = event.data as Record<string, unknown> | null
      if (!data || data.type !== PAGE_SEND_MESSAGE_HUMANIZED_RESPONSE_TYPE || data.requestId !== requestId) return

      window.clearTimeout(timeoutId)
      window.removeEventListener('message', onSendResponse)

      console.log('[ChamaLead:content] Humanized send response', data)
      sendResponse({
        success: data.success === true,
        error: data.error,
      })
    }

    window.addEventListener('message', onSendResponse)
    window.postMessage({
      type: PAGE_SEND_MESSAGE_HUMANIZED_REQUEST_TYPE,
      requestId,
      phoneNumber,
      message: messageText,
      humanizationConfig,
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
