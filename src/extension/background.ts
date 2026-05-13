import { type HumanizationConfig } from '@/features/whatsapp/humanization'

const STORAGE_KEY = 'chamalead_bulk_send_state'
const UPDATE_STORAGE_KEY = 'chamalead_update_info'

function extractPlaceholders(text: string): string[] {
  const names: string[] = []
  const regex = /\{\{([^}]+)\}\}/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const name = match[1].trim()
    if (name && !names.includes(name)) {
      names.push(name)
    }
  }
  regex.lastIndex = 0
  return names
}

function renderMessage(
  template: string,
  variables: Record<string, string>,
  usedNames: string[],
): string {
  let result = template
  for (const name of usedNames) {
    const value = variables[name] ?? ''
    const pattern = '\\{\\{' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\}\\}'
    const regex = new RegExp(pattern, 'g')
    result = result.replace(regex, value)
  }
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  return result
}

function shouldUseFallback(
  _template: string,
  variables: Record<string, string>,
  usedNames: string[],
): boolean {
  for (const name of usedNames) {
    const value = variables[name] ?? ''
    if (!value || value.trim().length === 0) {
      return true
    }
  }
  return false
}

interface ReleaseUpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string | null
  changelog: string | null
  publishedAt: string | null
  checkedAt: string | null
  error?: string
  [key: string]: unknown
}

interface CsvRecipient {
  phone: string
  variables: Record<string, string>
}

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
  recipients?: CsvRecipient[]
  fallbackMessage?: string
  humanizationConfig?: HumanizationConfig
}

let burstCount = 0

function getHumanizedDelay(_state: StoredBulkSendState, config: HumanizationConfig): number {
  if (config.burstMode && config.burstSize > 0 && burstCount >= config.burstSize - 1) {
    burstCount = 0
    const range = config.burstPauseMax - config.burstPauseMin
    const basePause = Math.floor(Math.random() * (range + 1)) + config.burstPauseMin
    const variation = 0.7 + Math.random() * 0.6
    return Math.round(basePause * variation)
  }

  burstCount++
  const range = config.maxDelay - config.minDelay
  return Math.floor(Math.random() * (range + 1)) + config.minDelay
}

function getHumanizedFallbackDelay(): number {
  return Math.floor(Math.random() * (11000 - 6000 + 1)) + 6000
}

function estimateHumanizationDuration(message: string, config: HumanizationConfig): number {
  const PRE_MSG_OVERHEAD_MS = 1000
  const POST_MSG_OVERHEAD_MS = 800
  const CHAT_OPEN_OVERHEAD_MS = 2000
  const READ_CHAT_OVERHEAD_MS = 1500
  const EXISTENCE_CHECK_OVERHEAD_MS = 1500

  let total = EXISTENCE_CHECK_OVERHEAD_MS

  if (config.openChat) {
    total += CHAT_OPEN_OVERHEAD_MS
  }

  if (config.readChat && config.readCount > 0) {
    total += READ_CHAT_OVERHEAD_MS
  }

  const avgCharPerMs = config.typingSpeedMs / 1000
  const typingDuration = message.length * avgCharPerMs * 1000
  total += typingDuration

  total += PRE_MSG_OVERHEAD_MS
  total += POST_MSG_OVERHEAD_MS

  return Math.min(total, 300000)
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

  if (chrome.action && chrome.action.setBadgeText) {
    if (state.status === 'sending' && state.sent > 0) {
      void chrome.action.setBadgeText({ text: String(state.sent) })
      void chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' })
    } else if (state.status === 'completed') {
      void chrome.action.setBadgeText({ text: String(state.sent) })
      void chrome.action.setBadgeBackgroundColor({ color: '#10B981' })
      setTimeout(() => {
        void chrome.action.setBadgeText({ text: '' })
      }, 300000)
    }
  }
}

async function clearStoredState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

async function getUpdateInfo(): Promise<ReleaseUpdateInfo | null> {
  const result = await chrome.storage.local.get(UPDATE_STORAGE_KEY)
  const info = result[UPDATE_STORAGE_KEY]
  return info ? (info as ReleaseUpdateInfo) : null
}

async function setUpdateInfo(info: ReleaseUpdateInfo): Promise<void> {
  await chrome.storage.local.set({ [UPDATE_STORAGE_KEY]: info })
}

async function findWhatsAppTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  return tabs[0] ?? null
}

async function sendMessageToTab(
  tabId: number,
  phoneNumber: string,
  message: string,
  humanizationConfig?: HumanizationConfig,
  estimatedDurationMs?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (humanizationConfig) {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CHAMALEAD_SEND_MESSAGE_HUMANIZED',
        phoneNumber,
        message,
        humanizationConfig,
        estimatedDurationMs: estimatedDurationMs ?? 60000,
      })
      return response ?? { success: false, error: 'No response from content script' }
    }

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

  const phone = state.recipients?.[state.currentIndex]?.phone ?? state.numbers[state.currentIndex]
  const variables = state.recipients?.[state.currentIndex]?.variables ?? {}

  let messageToSend: string
  if (state.recipients && state.message) {
    const usedNames = extractPlaceholders(state.message)
    if (usedNames.length > 0 && shouldUseFallback(state.message, variables, usedNames)) {
      messageToSend = state.fallbackMessage ?? ''
    } else {
      messageToSend = renderMessage(state.message, variables, usedNames)
    }
  } else {
    messageToSend = state.message
  }

  if (state.messageType !== 'audio' && (!messageToSend || messageToSend.trim().length === 0)) {
    const afterSkip = await getStoredState()
    if (!afterSkip || afterSkip.status !== 'sending') return
    afterSkip.currentIndex++
    await setStoredState(addLog(afterSkip, `⚠ Pulando ${phone}: mensagem vazia (usando fallback)`))
    if (afterSkip.currentIndex >= afterSkip.numbers.length) {
      afterSkip.status = 'completed'
      afterSkip.currentPhone = null
      await setStoredState(afterSkip)
      return
    }
    const delay = getHumanizedFallbackDelay()
    setTimeout(() => void continueSending(), delay)
    return
  }

  const updated = { ...state, currentPhone: phone }
  await setStoredState(addLog(updated, `Enviando para ${phone} (${state.currentIndex + 1}/${state.total})...`))

  let result: { success: boolean; error?: string }

  if (state.messageType === 'audio' && state.audioBase64) {
    result = await sendAudioToTab(tab.id, phone, state.audioBase64)
  } else {
    const messageParts = splitMessageByDoubleNewline(messageToSend)
    result = { success: true }

    const config = state.humanizationConfig

    for (let pi = 0; pi < messageParts.length; pi++) {
      const part = messageParts[pi]
      const estimatedMs = config ? estimateHumanizationDuration(part, config) : undefined

      const partResult = await sendMessageToTab(tab.id, phone, part, config, estimatedMs)
      if (!partResult.success) {
        result = partResult
        break
      }

      if (pi < messageParts.length - 1) {
        const microDelay = config ? 800 + Math.floor(Math.random() * 1200) : 0
        if (microDelay > 0) {
          await new Promise((r) => setTimeout(r, microDelay))
        }
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

  const config = afterSend.humanizationConfig ?? state.humanizationConfig
  const delay = config ? getHumanizedDelay(afterSend, config) : getHumanizedFallbackDelay()
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
    sendResponse: (response?: unknown) => void,
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
      getStoredState().then((existingState) => {
        if (existingState && (existingState.status === 'sending' || existingState.status === 'paused')) {
          sendResponse({ success: false, error: 'Uma campanha ja esta em andamento' })
          return
        }

        const numbersText = message.numbersText as string
        const messageText = message.messageText as string
        const audioBase64 = message.audioBase64 as string | undefined
        const isAudio = message.isAudio as boolean
        const recipients = message.recipients as CsvRecipient[] | undefined
        const fallbackMessage = message.fallbackMessage as string | undefined
        const humanizationConfig = message.humanizationConfig as HumanizationConfig | undefined

        const numbers = numbersText
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n.length > 0)
          .map(formatPhoneNumber)

        if (numbers.length === 0) {
          sendResponse({ success: false, error: 'Nenhum número válido encontrado' })
          return
        }

        burstCount = 0

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
          recipients,
          fallbackMessage,
          humanizationConfig,
        }

        const withLog = addLog(state, `Iniciando envio para ${numbers.length} números...`)

        if (chrome.action && chrome.action.setBadgeText) {
          void chrome.action.setBadgeText({ text: '0' })
          void chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' })
        }

        setStoredState(withLog).then(() => {
          sendResponse({ success: true })
          void processNextNumber(withLog)
        })
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
              if (chrome.action && chrome.action.setBadgeText) {
                void chrome.action.setBadgeText({ text: '' })
              }
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
          humanizationConfig: state.humanizationConfig,
          messageType: state.messageType,
        })
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_UPDATE_GET_INFO') {
      getUpdateInfo().then((info) => {
        sendResponse(info ?? null)
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_UPDATE_CHECK_NOW') {
      checkForUpdates()
        .then(() => getUpdateInfo())
        .then((info) => {
          sendResponse(info ?? {
            available: false,
            currentVersion: chrome.runtime.getManifest().version,
            latestVersion: '',
            releaseUrl: '',
            downloadUrl: null,
            changelog: null,
            publishedAt: null,
            checkedAt: new Date().toISOString(),
          })
        })
        .catch((error) => {
          console.error('[ChamaLead] Update check error:', error)
          sendResponse({
            available: false,
            currentVersion: chrome.runtime.getManifest().version,
            latestVersion: '',
            releaseUrl: '',
            downloadUrl: null,
            changelog: null,
            publishedAt: null,
            checkedAt: new Date().toISOString(),
            error: String(error),
          })
        })
      return true
    }

    if (message?.type === 'CHAMALEAD_UPDATE_DOWNLOAD') {
      getUpdateInfo().then((info) => {
        if (!info || !info.downloadUrl) {
          sendResponse({ success: false, error: 'No download URL available' })
          return
        }
        // Try chrome.downloads if available, otherwise open in tab
        if (chrome.downloads) {
          chrome.downloads.download({ url: info.downloadUrl }, () => {
            sendResponse({ success: true })
          })
        } else {
          chrome.tabs.create({ url: info.downloadUrl })
          sendResponse({ success: true })
        }
      })
      return true
    }

    if (message?.type === 'CHAMALEAD_UPDATE_VIEW_RELEASE') {
      getUpdateInfo().then((info) => {
        if (info?.releaseUrl) {
          chrome.tabs.create({ url: info.releaseUrl })
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'No release URL available' })
        }
      })
      return true
    }

    return false
  },
)

// Update checking constants
const GITHUB_REPO = 'klimadev/chamalead_extension'

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

// Find the preferred ZIP asset from release
function findZipAsset(release: { assets: Array<{ name: string; browser_download_url: string }> }): string | null {
  const preferred = release.assets.find((a) => a.name.startsWith('chamalead-extension-') && a.name.endsWith('.zip'))
  if (preferred) return preferred.browser_download_url
  const fallback = release.assets.find((a) => a.name.endsWith('.zip'))
  return fallback ? fallback.browser_download_url : null
}

// Function to check for updates and store normalized metadata
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
    const available = isNewerVersion(latestVersion, currentVersion)

    const updateInfo: ReleaseUpdateInfo = {
      available,
      currentVersion,
      latestVersion,
      releaseUrl: latestRelease.html_url,
      downloadUrl: available ? findZipAsset(latestRelease) : null,
      changelog: latestRelease.body ?? null,
      publishedAt: latestRelease.published_at ?? null,
      checkedAt: new Date().toISOString(),
    }

    await setUpdateInfo(updateInfo)

    if (available) {
      console.info(`[ChamaLead] Update available: ${latestVersion} (current: ${currentVersion})`)
    } else {
      console.info(`[ChamaLead] Extension is up to date: ${currentVersion}`)
    }
  } catch (error) {
    const errorInfo: ReleaseUpdateInfo = {
      available: false,
      currentVersion: chrome.runtime.getManifest().version,
      latestVersion: '',
      releaseUrl: '',
      downloadUrl: null,
      changelog: null,
      publishedAt: null,
      checkedAt: new Date().toISOString(),
      error: String(error),
    }
    await setUpdateInfo(errorInfo)
    console.error('[ChamaLead] Update check failed:', error)
  }
}

// Resume interrupted bulk send if any
(void (async () => {
   const state = await getStoredState()
   if (state && state.status === 'sending') {
     console.info('[ChamaLead] Resuming interrupted bulk send')
     await continueSending()
   }
 })());
