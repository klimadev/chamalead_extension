console.log('[ChamaLead] Content script loaded, version: 0.1.2')
console.log('[ChamaLead] Current URL:', window.location.href)
console.log('[ChamaLead] Document readyState:', document.readyState)

const WA_JS_SCRIPT_PATH = 'vendor/wppconnect-wa.js'
const WA_JS_SCRIPT_ID = 'chamalead-wppconnect-wa-js'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

declare global {
  interface Window {
    WPP?: unknown
  }
}

let injectionAttempts = 0

function checkWppGlobal(): boolean {
  if (window.WPP) {
    console.info('[ChamaLead] WPP global detected')
    return true
  }
  console.warn('[ChamaLead] WPP global not found')
  return false
}

function injectWaJs(): void {
  if (window.WPP) {
    console.info('[ChamaLead] WA-JS already available before injection')
    return
  }

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
    injectWaJs()
    setupNavigationObserver()
    return
  }

  console.info('[ChamaLead] Waiting for full page load before WA-JS injection')
  window.addEventListener(
    'load',
    () => {
      console.info('[ChamaLead] Full page load event received, injecting WA-JS now')
      injectWaJs()
      setupNavigationObserver()
    },
    { once: true },
  )
}

void chrome.runtime.sendMessage({ type: 'CHAMALEAD_HEALTHCHECK' })
injectWaJsAfterFullLoad()
