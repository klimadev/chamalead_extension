import { useState, useEffect, useCallback, useRef } from 'react'
import type { CsvRecipient } from './csv-messages'

export function formatPhoneNumber(phone: string): string {
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

export interface BulkSendProgress {
  total: number
  sent: number
  failed: number
  currentPhone: string | null
  status: 'idle' | 'sending' | 'paused' | 'completed' | 'error'
}

export interface BulkSendOptions {
  numbersText: string
  messageText: string
  recipients?: CsvRecipient[]
  fallbackMessage?: string
}

interface BackgroundState {
  total: number
  sent: number
  failed: number
  currentPhone: string | null
  status: 'idle' | 'sending' | 'paused' | 'completed' | 'error'
  logs: string[]
}

const POLL_INTERVAL = 2000

export function useBulkSend() {
  const [progress, setProgress] = useState<BulkSendProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    currentPhone: null,
    status: 'idle',
  })

  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchState = useCallback(async () => {
    return new Promise<BackgroundState | null>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'CHAMALEAD_BULK_SEND_GET_STATE' },
        (response) => {
          if (response?.status === 'idle' || !response) {
            resolve(null)
            return
          }
          resolve(response as BackgroundState)
        },
      )
    })
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const state = await fetchState()
      if (state) {
        setProgress({
          total: state.total,
          sent: state.sent,
          failed: state.failed,
          currentPhone: state.currentPhone,
          status: state.status,
        })
        setLogs(state.logs)
        if (state.status === 'completed' || state.status === 'error') {
          stopPolling()
        }
      } else {
        stopPolling()
      }
    }, POLL_INTERVAL)
  }, [fetchState, stopPolling])

  useEffect(() => {
    fetchState().then((state) => {
      if (state) {
        setProgress({
          total: state.total,
          sent: state.sent,
          failed: state.failed,
          currentPhone: state.currentPhone,
          status: state.status,
        })
        setLogs(state.logs)
        if (state.status === 'sending' || state.status === 'paused') {
          startPolling()
        }
      }
    })

    return () => {
      stopPolling()
    }
  }, [fetchState, startPolling, stopPolling])

  const startBulkSend = useCallback(
    async (options: BulkSendOptions | string, messageText?: string) => {
      setLoading(true)

      const payload = typeof options === 'string'
        ? { numbersText: options, messageText: messageText ?? '', isAudio: false }
        : { numbersText: options.numbersText, messageText: options.messageText, isAudio: false, recipients: options.recipients, fallbackMessage: options.fallbackMessage }

      chrome.runtime.sendMessage(
        {
          type: 'CHAMALEAD_BULK_SEND_START',
          ...payload,
        },
        (response) => {
          setLoading(false)
          if (response?.success) {
            startPolling()
          }
        },
      )
    },
    [startPolling],
  )

  const startBulkSendAudio = useCallback(
    async (numbersText: string, audioBase64: string) => {
      setLoading(true)
      chrome.runtime.sendMessage(
        {
          type: 'CHAMALEAD_BULK_SEND_START',
          numbersText,
          messageText: '',
          audioBase64,
          isAudio: true,
        },
        (response) => {
          setLoading(false)
          if (response?.success) {
            startPolling()
          }
        },
      )
    },
    [startPolling],
  )

  const pauseBulkSend = useCallback(() => {
    chrome.runtime.sendMessage(
      { type: 'CHAMALEAD_BULK_SEND_PAUSE' },
      () => {
        stopPolling()
        fetchState().then((state) => {
          if (state) {
            setProgress((prev) => ({ ...prev, status: 'paused' }))
          }
        })
      },
    )
  }, [fetchState, stopPolling])

  const resumeBulkSend = useCallback(() => {
    chrome.runtime.sendMessage(
      { type: 'CHAMALEAD_BULK_SEND_RESUME' },
      () => {
        startPolling()
      },
    )
  }, [startPolling])

  const resetBulkSend = useCallback(() => {
    stopPolling()
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_BULK_SEND_STOP' }, () => {
      setProgress({
        total: 0,
        sent: 0,
        failed: 0,
        currentPhone: null,
        status: 'idle',
      })
      setLogs([])
    })
  }, [stopPolling])

  return {
    progress,
    logs,
    loading,
    startBulkSend,
    startBulkSendAudio,
    pauseBulkSend,
    resumeBulkSend,
    resetBulkSend,
  }
}
