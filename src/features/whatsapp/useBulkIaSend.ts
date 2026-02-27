import { useState, useCallback } from 'react'

export interface BulkIaSendProgress {
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

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `55${cleaned}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `55${cleaned.slice(1)}`
  }
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    return cleaned
  }
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned
  }
  return cleaned
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

async function fetchMessageFromWebhook(phoneNumber: string): Promise<string | null> {
  try {
    const response = await fetch('http://177.153.38.26:5678/webhook/prospectchamalead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber, prospect: true }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      return data[0].output || data[0].message || data[0].msg || data[0].text || null
    }

    return data.output || data.message || data.msg || data.text || data.content || null
  } catch (error) {
    console.error('[ChamaLead] Webhook error:', error)
    return null
  }
}

export function useBulkIaSend() {
  const [progress, setProgress] = useState<BulkIaSendProgress>({
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

  const startBulkIaSend = useCallback(
    async (numbersText: string) => {
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

      addLog(`Iniciando Bulk IA para ${numbers.length} números...`)
      addLog('↪️ Buscando mensagem via webhook para cada lead...')

      for (let i = 0; i < numbers.length; i++) {
        const phone = numbers[i]
        setProgress((prev) => ({ ...prev, currentPhone: phone }))

        addLog(`[${i + 1}/${numbers.length}] Buscando mensagem para ${phone}...`)

        const message = await fetchMessageFromWebhook(phone)

        if (!message) {
          setProgress((prev) => ({ ...prev, failed: prev.failed + 1 }))
          addLog(`✗ Falha: Sem resposta do webhook para ${phone}`)
          if (i < numbers.length - 1) {
            const delay = getRandomDelay()
            addLog(`Aguardando ${(delay / 1000).toFixed(1)}s...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
          continue
        }

        addLog(`Mensagem obtida: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)
        addLog(`Enviando para ${phone}...`)

        const result = await sendMessageToTab(phone, message)

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

  const pauseBulkIaSend = useCallback(() => {
    setProgress((prev) => ({ ...prev, status: 'paused' }))
    addLog('Envio pausado')
  }, [addLog])

  const resetBulkIaSend = useCallback(() => {
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
    startBulkIaSend,
    pauseBulkIaSend,
    resetBulkIaSend,
  }
}
