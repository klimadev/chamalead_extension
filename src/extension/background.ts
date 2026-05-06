const STORAGE_KEY = 'chamalead_bulk_send_state'

interface StoredBulkSendState {
  total: number
  sent: number
  failed: number
  currentPhone: string | null
  status: 'idle' | 'sending' | 'paused' | 'completed' | 'error'
  numbers: string[]
  message: string
  messageType: 'text' | 'audio'
  audioBase64?: string
  logs: string[]
  currentIndex: number
}

function getRandomDelay(): number {
  return Math.floor(Math.random() * (11000 - 6000 + 1)) + 6000
}

function addLog(state: StoredBulkSendState, message: string): StoredBulkSendState {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  return {
    ...state,
    logs: [...state.logs, `[${timestamp}] ${message}`],
  }
}

async function getStoredState(): Promise<StoredBulkSendState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const state = result[STORAGE_KEY]
  return state ? (state as StoredBulkSendState) : null
}

async function setStoredState(state: StoredBulkSendState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state })
}

async function clearStoredState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

async function findWhatsAppTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  return tabs[0] ?? null
}

async function sendMessageToTab(
  tabId: number,
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CHAMALEAD_SEND_MESSAGE',
      phoneNumber,
      message,
    })
    return response ?? { success: false, error: 'No response from content script' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function sendAudioToTab(
  tabId: number,
  phoneNumber: string,
  audioBase64: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CHAMALEAD_SEND_AUDIO',
      phoneNumber,
      audioBase64,
    })
    return response ?? { success: false, error: 'No response from content script' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

function splitMessageByDoubleNewline(message: string): string[] {
  const parts = message.split(/\n\n+/)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

async function processNextNumber(state: StoredBulkSendState): Promise<void> {
  if (state.status !== 'sending' || state.currentIndex >= state.numbers.length) {
    return
  }

  const tab = await findWhatsAppTab()
  if (!tab?.id) {
    const updated = addLog(state, 'WhatsApp tab not found')
    updated.status = 'error'
    await setStoredState(updated)
    return
  }

  const phone = state.numbers[state.currentIndex]
  const updated = { ...state, currentPhone: phone }
  await setStoredState(addLog(updated, `Enviando para ${phone} (${state.currentIndex + 1}/${state.total})...`))

  let result: { success: boolean; error?: string }

  if (state.messageType === 'audio' && state.audioBase64) {
    result = await sendAudioToTab(tab.id, phone, state.audioBase64)
  } else {
    const messageParts = splitMessageByDoubleNewline(state.message)
    result = { success: true }

    for (const part of messageParts) {
      const partResult = await sendMessageToTab(tab.id, phone, part)
      if (!partResult.success) {
        result = partResult
        break
      }
    }
  }

  const afterSend = await getStoredState()
  if (!afterSend || afterSend.status !== 'sending') {
    return
  }

  if (result.success) {
    afterSend.sent++
    await setStoredState(addLog(afterSend, `✓ Enviado para ${phone}`))
  } else {
    afterSend.failed++
    await setStoredState(addLog(afterSend, `✗ Falha para ${phone}: ${result.error}`))
  }

  afterSend.currentIndex++
  await setStoredState(afterSend)

  if (afterSend.currentIndex >= afterSend.numbers.length) {
    await setStoredState(
      addLog(afterSend, `Concluído! Enviados: ${afterSend.sent}, Falhas: ${afterSend.failed}`),
    )
    afterSend.status = 'completed'
    afterSend.currentPhone = null
    await setStoredState(afterSend)
    return
  }

  const delay = getRandomDelay()
  await setStoredState(addLog(afterSend, `Aguardando ${(delay / 1000).toFixed(1)}s...`))

  setTimeout(() => {
    void continueSending()
  }, delay)
}

async function continueSending(): Promise<void> {
  const state = await getStoredState()
  if (!state || state.status !== 'sending') {
    return
  }
  await processNextNumber(state)
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const withoutLeadingZeros = cleaned.replace(/^0+/, '')
  if (!withoutLeadingZeros) return ''
  if (withoutLeadingZeros.startsWith('55')) return withoutLeadingZeros
  if (withoutLeadingZeros.length === 10 || withoutLeadingZeros.length === 11) {
    return `55${withoutLeadingZeros}`
  }
  if (withoutLeadingZeros.length >= 8 && withoutLeadingZeros.length <= 9) {
    return `55${withoutLeadingZeros}`
  }
  return withoutLeadingZeros
}

chrome.runtime.onInstalled.addListener(() => {
  console.info('[ChamaLead] Extension installed/updated')
})

chrome.runtime.onMessage.addListener(
  (
    message: Record<string, unknown>,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: Record<string, unknown>) => void,
  ) => {
    if (message?.type === 'CHAMALEAD_GET_WPP_STATUS') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))
        if (waTab?.id) {
          chrome.tabs.sendMessage(waTab.id, message, (response) => {
            sendResponse(response ?? { isReady: false, isAuthenticated: false })
          })
          return
        }
        sendResponse({ isReady: false, isAuthenticated: false, error: 'WA tab not found' })
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_SEND_AUDIO') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))
        if (waTab?.id) {
          chrome.tabs.sendMessage(waTab.id, message, (response) => {
            sendResponse(response ?? { success: false, error: 'No response' })
          })
          return
        }
        sendResponse({ success: false, error: 'WA tab not found' })
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_HEALTHCHECK') {
      sendResponse({ ok: true, tabId: _sender.tab?.id ?? null })
      return
    }

    if (message?.type === 'CHAMALEAD_BULK_SEND_START') {
      const numbersText = message.numbersText as string
      const messageText = message.messageText as string
      const audioBase64 = message.audioBase64 as string | undefined
      const isAudio = message.isAudio as boolean

      const numbers = numbersText
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .map(formatPhoneNumber)

      if (numbers.length === 0) {
        sendResponse({ success: false, error: 'Nenhum número válido encontrado' })
        return
      }

      const state: StoredBulkSendState = {
        total: numbers.length,
        sent: 0,
        failed: 0,
        currentPhone: null,
        status: 'sending',
        numbers,
        message: messageText,
        messageType: isAudio ? 'audio' : 'text',
        audioBase64: isAudio ? audioBase64 : undefined,
        logs: [],
        currentIndex: 0,
      }

      const withLog = addLog(state, `Iniciando envio para ${numbers.length} números...`)
      setStoredState(withLog).then(() => {
        sendResponse({ success: true })
        void processNextNumber(withLog)
      })

      return true
    }

    if (message?.type === 'CHAMALEAD_BULK_SEND_PAUSE') {
      getStoredState().then((state) => {
        if (state && state.status === 'sending') {
          state.status = 'paused'
          setStoredState(addLog(state, 'Envio pausado')).then(() => {
            sendResponse({ success: true })
          })
        } else {
          sendResponse({ success: false, error: 'Nenhum envio em andamento' })
        }
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_BULK_SEND_RESUME') {
      getStoredState().then((state) => {
        if (state && state.status === 'paused') {
          state.status = 'sending'
          setStoredState(addLog(state, 'Envio retomado')).then(() => {
            sendResponse({ success: true })
            void continueSending()
          })
        } else {
          sendResponse({ success: false, error: 'Nenhum envio pausado' })
        }
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_BULK_SEND_STOP') {
      getStoredState().then((state) => {
        if (state) {
          state.status = 'idle'
          setStoredState(addLog(state, 'Envio cancelado')).then(() => {
            void clearStoredState().then(() => {
              sendResponse({ success: true })
            })
          })
        } else {
          sendResponse({ success: true })
        }
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_BULK_SEND_GET_STATE') {
      getStoredState().then((state) => {
        if (!state) {
          sendResponse({ status: 'idle' })
          return
        }
        sendResponse({
          total: state.total,
          sent: state.sent,
          failed: state.failed,
          currentPhone: state.currentPhone,
          status: state.status,
          logs: state.logs,
        })
      })
      return true
    }

    return false
  },
)

// Update checking constants
const GITHUB_REPO = 'klimadev/chamalead_extension'
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours

// Version comparison helper
function isNewerVersion(v1: string, v2: string): boolean {
  const [major1, minor1, patch1] = v1.split('.').map(Number)
  const [major2, minor2, patch2] = v2.split('.').map(Number)
  
  if (major1 > major2) return true
  if (major1 < major2) return false
  if (minor1 > minor2) return true
  if (minor1 < minor2) return false
  return patch1 > patch2
}

// Notification function
function showUpdateNotification(version: string, _releaseUrl: string, releaseNotes: string | null): void {
  const notificationId = `chamalead-update-${Date.now()}`
  
  // Truncate release notes if too long
  const notesPreview = releaseNotes 
    ? `${releaseNotes.substring(0, 100)}${releaseNotes.length > 100 ? '...' : ''}`
    : 'Check the release page for details.'
  
  chrome.notifications.create(
    notificationId,
    {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'ChamaLead Update Available',
      message: `Version ${version} is available!\n${notesPreview}`,
      priority: 2
    }
  )
}

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('chamalead-update-')) {
    chrome.tabs.create({ url: `https://github.com/${GITHUB_REPO}/releases/latest` })
  }
})

// Function to check for updates
async function checkForUpdates(): Promise<void> {
  try {
    const manifest = chrome.runtime.getManifest()
    const currentVersion = manifest.version
    
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
    
    const latestRelease = await response.json()
    const latestVersion = latestRelease.tag_name.replace(/^v/, '') // Handle v1.2.3 format
    
    if (isNewerVersion(latestVersion, currentVersion)) {
      showUpdateNotification(latestVersion, latestRelease.html_url, latestRelease.body)
      console.info(`[ChamaLead] Update available: ${latestVersion} (current: ${currentVersion})`)
    } else {
      console.info(`[ChamaLead] Extension is up to date: ${currentVersion}`)
    }
  } catch (error) {
    console.error('[ChamaLead] Update check failed:', error)
  }
};

// Check for updates on startup and set interval
checkForUpdates();
setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);

// Resume interrupted bulk send if any
(void (async () => {
   const state = await getStoredState()
   if (state && state.status === 'sending') {
     console.info('[ChamaLead] Resuming interrupted bulk send')
     await continueSending()
   }
 })());
