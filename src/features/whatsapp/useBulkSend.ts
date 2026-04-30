import { useState, useCallback } from 'react'

export interface BulkSendProgress {
  total: number
  sent: number
  failed: number
  currentPhone: string | null
  status: 'idle' | 'sending' | 'paused' | 'completed' | 'error'
}

interface SendResult {
  success: boolean
  error?: string
}

function getRandomDelay(): number {
  return Math.floor(Math.random() * (11000 - 6000 + 1)) + 6000
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  // Remove leading zeros
  const withoutLeadingZeros = cleaned.replace(/^0+/, '')
  
  // If empty after cleaning, return empty
  if (!withoutLeadingZeros) return ''
  
  // Already has 55 (Brazil) prefix
  if (withoutLeadingZeros.startsWith('55')) {
    return withoutLeadingZeros
  }
  
  // Brazilian mobile: 11 digits (DDD 2 + 9-digit number) - add 55
  // Brazilian landline: 10 digits (DDD 2 + 8-digit number) - add 55
  if (withoutLeadingZeros.length === 10 || withoutLeadingZeros.length === 11) {
    return `55${withoutLeadingZeros}`
  }
  
  // If 8-9 digits (missing DDD), we can't fix automatically
  // Just add 55 and let the user verify
  if (withoutLeadingZeros.length >= 8 && withoutLeadingZeros.length <= 9) {
    return `55${withoutLeadingZeros}`
  }
  
  // Return as-is if we can't determine format
  return withoutLeadingZeros
}

function splitMessageByDoubleNewline(message: string): string[] {
  const parts = message.split(/\n\n+/)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

async function sendMessageToTab(phoneNumber: string, message: string): Promise<SendResult> {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))

  if (!waTab?.id) {
    return { success: false, error: 'WhatsApp tab not found' }
  }

  const messageParts = splitMessageByDoubleNewline(message)

  try {
    for (const part of messageParts) {
      const response = await chrome.tabs.sendMessage(waTab.id, {
        type: 'CHAMALEAD_SEND_MESSAGE',
        phoneNumber,
        message: part,
      })
      if (!response.success) {
        return response
      }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function sendAudioToTab(phoneNumber: string, audioBase64: string): Promise<SendResult> {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const waTab = tabs.find((tab) => tab.url?.includes('web.whatsapp.com'))

  if (!waTab?.id) {
    return { success: false, error: 'WhatsApp tab not found' }
  }

  try {
    const response = await chrome.tabs.sendMessage(waTab.id, {
      type: 'CHAMALEAD_SEND_AUDIO',
      phoneNumber,
      audioBase64,
    })
    return response
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export function useBulkSend() {
  const [progress, setProgress] = useState<BulkSendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    currentPhone: null,
    status: 'idle',
  })

  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }, [])

  const startBulkSend = useCallback(
    async (numbersText: string, messageText: string) => {
      const numbers = numbersText
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .map(formatPhoneNumber)

      if (numbers.length === 0) {
        addLog('Nenhum número válido encontrado')
        return
      }

      setProgress({
        total: numbers.length,
        sent: 0,
        failed: 0,
        currentPhone: null,
        status: 'sending',
      })

      addLog(`Iniciando envio para ${numbers.length} números...`)

      for (let i = 0; i < numbers.length; i++) {
        const phone = numbers[i]
        setProgress((prev) => ({ ...prev, currentPhone: phone }))

        addLog(`Enviando para ${phone} (${i + 1}/${numbers.length})...`)

        const result = await sendMessageToTab(phone, messageText)

        if (result.success) {
          setProgress((prev) => ({ ...prev, sent: prev.sent + 1 }))
          addLog(`✓ Enviado para ${phone}`)
        } else {
          setProgress((prev) => ({ ...prev, failed: prev.failed + 1 }))
          addLog(`✗ Falha para ${phone}: ${result.error}`)
        }

        if (i < numbers.length - 1) {
          const delay = getRandomDelay()
          addLog(`Aguardando ${(delay / 1000).toFixed(1)}s...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      setProgress((prev) => {
        addLog(`Concluído! Enviados: ${prev.sent}, Falhas: ${prev.failed}`)
        return {
          ...prev,
          currentPhone: null,
          status: 'completed',
        }
      })
    },
    [addLog],
  )

  const startBulkSendAudio = useCallback(
    async (numbersText: string, audioBase64: string) => {
      const numbers = numbersText
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .map(formatPhoneNumber)

      if (numbers.length === 0) {
        addLog('Nenhum número válido encontrado')
        return
      }

      setProgress({
        total: numbers.length,
        sent: 0,
        failed: 0,
        currentPhone: null,
        status: 'sending',
      })

      addLog(`Iniciando envio de áudio para ${numbers.length} números...`)

      for (let i = 0; i < numbers.length; i++) {
        const phone = numbers[i]
        setProgress((prev) => ({ ...prev, currentPhone: phone }))

        addLog(`Enviando áudio para ${phone} (${i + 1}/${numbers.length})...`)

        const result = await sendAudioToTab(phone, audioBase64)

        if (result.success) {
          setProgress((prev) => ({ ...prev, sent: prev.sent + 1 }))
          addLog(`✓ Áudio enviado para ${phone}`)
        } else {
          setProgress((prev) => ({ ...prev, failed: prev.failed + 1 }))
          addLog(`✗ Falha ao enviar áudio para ${phone}: ${result.error}`)
        }

        if (i < numbers.length - 1) {
          const delay = getRandomDelay()
          addLog(`Aguardando ${(delay / 1000).toFixed(1)}s...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      setProgress((prev) => {
        addLog(`Concluído! Enviados: ${prev.sent}, Falhas: ${prev.failed}`)
        return {
          ...prev,
          currentPhone: null,
          status: 'completed',
        }
      })
    },
    [addLog],
  )

  const pauseBulkSend = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: 'paused' }))
    addLog('Envio pausado')
  }, [addLog])

  const resetBulkSend = useCallback(() => {
    setProgress({
      total: 0,
      sent: 0,
      failed: 0,
      currentPhone: null,
      status: 'idle',
    })
    setLogs([])
    addLog('Resetado')
  }, [addLog])

  return {
    progress,
    logs,
    startBulkSend,
    startBulkSendAudio,
    pauseBulkSend,
    resetBulkSend,
  }
}
