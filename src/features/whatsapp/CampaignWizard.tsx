import { useState, useRef, useMemo } from 'react'
import { useBulkSend, formatPhoneNumber } from './useBulkSend'
import type { BulkSendProgress } from './useBulkSend'
import { extractPlaceholders, validatePlaceholders, type CsvRecipient } from './csv-messages'
import { convertToOggOpus, convertWithMediaRecorder, fileToRawDataUrl, convertAudioWithFallback } from './audio-converter'
import type { WppStatus } from './useWppStatus'

import { Button } from '@/ui'

interface CsvData {
  headers: string[]
  rows: string[][]
}

const PHONE_KEYWORDS = ['telefone', 'phone', 'celular', 'tel', 'fone', 'whatsapp', 'numero', 'número', 'contato', 'mobile']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function detectPhoneColumn(headers: string[]): string {
  const lowerHeaders = headers.map(h => h.toLowerCase())
  for (const keyword of PHONE_KEYWORDS) {
    const index = lowerHeaders.findIndex(h => h === keyword || h.includes(keyword))
    if (index !== -1) return headers[index]
  }
  return headers[0] || ''
}

function parseCSV(text: string): CsvData {
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const result: CsvData = { headers: [], rows: [] }
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i]
    if (char === '"') {
      if (inQuotes && i + 1 < normalizedText.length && normalizedText[i + 1] === '"') {
        currentLine += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim().length > 0) lines.push(currentLine)
      currentLine = ''
    } else {
      currentLine += char
    }
  }
  if (currentLine.trim().length > 0) lines.push(currentLine)

  if (lines.length === 0) throw new Error('Arquivo CSV vazio')

  const parseLine = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    let fieldQuoted = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        inQuotes = !inQuotes
        fieldQuoted = true
      } else if (char === ',' && !inQuotes) {
        fields.push(fieldQuoted ? current : current.trim())
        current = ''
        fieldQuoted = false
      } else {
        current += char
      }
      i++
    }
    fields.push(fieldQuoted ? current : current.trim())
    return fields
  }

  result.headers = parseLine(lines[0])
  result.rows = lines.slice(1).map((line) => parseLine(line))
  return result
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13 && digits.startsWith('55')
}

function ProgressBar({ prog }: { prog: BulkSendProgress }) {
  if (prog.status === 'idle') return null
  const percent = prog.total > 0 ? Math.round(((prog.sent + prog.failed) / prog.total) * 100) : 0

  return (
    <div className="wizard-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-stats">
        <span>Enviados: {prog.sent}</span>
        <span>Falhas: {prog.failed}</span>
        <span>{percent}%</span>
      </div>
      {prog.currentPhone && <div className="current-phone">Enviando para: {prog.currentPhone}</div>}
    </div>
  )
}

type WizardStep = 1 | 2 | 3
type CampaignPhase = 'building' | 'sending' | 'paused' | 'completed'
type CampaignMode = 'text' | 'audio'

interface CampaignWizardProps {
  onBack: () => void
  wppStatus: WppStatus
}

const STEP_LABELS: Record<WizardStep, string> = { 1: 'Contatos', 2: 'Mensagem', 3: 'Revisao' }

export function CampaignWizard({ onBack, wppStatus }: CampaignWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [mode, setMode] = useState<CampaignMode>('text')

  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [fallbackMessage, setFallbackMessage] = useState('')
  const [audioBase64, setAudioBase64] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [audioMethods, setAudioMethods] = useState<{ id: string; label: string; dataUrl: string; error: string; converting: boolean }[]>([
    { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: false },
    { id: 'ogg', label: 'OGG/Opus', dataUrl: '', error: '', converting: false },
    { id: 'webm', label: 'WebM/Opus (MediaRecorder)', dataUrl: '', error: '', converting: false },
    { id: 'auto', label: 'Auto (fallback)', dataUrl: '', error: '', converting: false },
  ])
  const isConverting = useMemo(() => audioMethods.some(m => m.converting), [audioMethods])
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [csvError, setCsvError] = useState<string>('')
  const [previewNumbers, setPreviewNumbers] = useState<string[]>([])
  const [recipients, setRecipients] = useState<CsvRecipient[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const fileReaderRef = useRef<FileReader | null>(null)

  const { progress, logs, loading, startBulkSend, startBulkSendAudio, pauseBulkSend, resumeBulkSend, resetBulkSend } = useBulkSend()

  const phase: CampaignPhase = progress.status === 'sending' ? 'sending'
    : progress.status === 'paused' ? 'paused'
    : progress.status === 'completed' ? 'completed'
    : 'building'

  const canSend = wppStatus.isReady && wppStatus.isAuthenticated && !loading
  const contactCount = numbers
    .split(',')
    .map(item => item.trim())
    .filter(Boolean).length

  const hasValidContacts = contactCount > 0 || previewNumbers.length > 0
  const canGoToMessage = hasValidContacts && csvError === ''

  const updatePreview = (col: string, data?: CsvData) => {
    setSelectedColumn(col)
    const csvDataSource = data || csvData
    if (!csvDataSource || !col) {
      setPreviewNumbers([])
      return
    }
    const colIndex = csvDataSource.headers.indexOf(col)
    if (colIndex === -1) {
      setPreviewNumbers([])
      return
    }
    const formatted = csvDataSource.rows
      .map((row) => formatPhoneNumber(row[colIndex] || ''))
      .filter((phone) => phone && phone.length > 0)
    setPreviewNumbers(formatted)
  }

  const invalidCount = useMemo(() =>
    previewNumbers.filter(p => !isValidPhone(p)).length,
    [previewNumbers]
  )

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')
    setCsvData(null)
    setSelectedColumn('')
    setPreviewNumbers([])

    if (file.size > MAX_FILE_SIZE) {
      setCsvError('Arquivo muito grande. Tamanho maximo: 5MB')
      return
    }

    if (fileReaderRef.current) fileReaderRef.current.abort()

    const reader = new FileReader()
    fileReaderRef.current = reader

    reader.onload = (event) => {
      fileReaderRef.current = null
      try {
        const result = event.target?.result
        if (!result || typeof result !== 'string') {
          setCsvError('Erro: arquivo vazio ou invalido')
          return
        }
        const data = parseCSV(result)
        setCsvData(data)
        const detected = detectPhoneColumn(data.headers)
        updatePreview(detected, data)
      } catch (error) {
        setCsvError(`Erro ao ler CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    reader.onabort = () => { if (fileReaderRef.current === reader) fileReaderRef.current = null }
    reader.onerror = () => { if (fileReaderRef.current === reader) fileReaderRef.current = null; setCsvError('Erro ao ler o arquivo') }
    reader.readAsText(file)
  }

  const handleImportColumn = () => {
    if (!csvData || !selectedColumn || previewNumbers.length === 0) return
    const validPhones = previewNumbers.filter(p => isValidPhone(p))
    if (validPhones.length === 0) {
      setCsvError('Nenhum numero valido encontrado na coluna selecionada')
      return
    }
    const phoneColIndex = csvData.headers.indexOf(selectedColumn)
    const builtRecipients: CsvRecipient[] = []
    for (const row of csvData.rows) {
      const phone = formatPhoneNumber(row[phoneColIndex] || '')
      if (!phone || !isValidPhone(phone)) continue
      const variables: Record<string, string> = {}
      for (let i = 0; i < csvData.headers.length; i++) {
        const header = csvData.headers[i]
        if (header !== selectedColumn) variables[header] = row[i] || ''
      }
      builtRecipients.push({ phone, variables })
    }
    const phones = builtRecipients.map(r => r.phone)
    setNumbers((prev) => prev ? `${prev}, ${phones.join(', ')}` : phones.join(', '))
    setRecipients(builtRecipients)
    setSelectedColumn('')
    setPreviewNumbers([])
    setCsvError('')
  }

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setCsvError('Arquivo de audio muito grande. Tamanho maximo: 5MB')
      return
    }
    setCsvError('')
    setAudioFileName(file.name)
    setAudioBase64('')

    setAudioMethods([
      { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: true },
      { id: 'ogg', label: 'OGG/Opus', dataUrl: '', error: '', converting: true },
      { id: 'webm', label: 'WebM/Opus (MediaRecorder)', dataUrl: '', error: '', converting: true },
      { id: 'auto', label: 'Auto (fallback)', dataUrl: '', error: '', converting: true },
    ])

    const tryAutoSelect = (methods: typeof audioMethods) => {
      if (audioBase64) return
      const auto = methods.find((m) => m.id === 'auto' && m.dataUrl)
      const ogg = methods.find((m) => m.id === 'ogg' && m.dataUrl)
      const webm = methods.find((m) => m.id === 'webm' && m.dataUrl)
      const raw = methods.find((m) => m.id === 'raw' && m.dataUrl)
      const best = auto || ogg || webm || raw
      if (best) setAudioBase64(best.dataUrl)
      const allDone = methods.every((m) => !m.converting)
      if (allDone && !best) setCsvError('Nao foi possivel processar o audio. Tente outro arquivo.')
    }

    const updateMethod = (id: string, dataUrl?: string, error?: string) => {
      setAudioMethods((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, dataUrl: dataUrl ?? '', error: error ?? '', converting: false } : m,
        )
        tryAutoSelect(next)
        return next
      })
    }

    fileToRawDataUrl(file)
      .then((dataUrl) => updateMethod('raw', dataUrl))
      .catch((err) => updateMethod('raw', undefined, err instanceof Error ? err.message : 'Erro RAW'))

    convertToOggOpus(file)
      .then((result) => updateMethod('ogg', result.dataUrl))
      .catch((err) => updateMethod('ogg', undefined, err instanceof Error ? err.message : 'Erro OGG'))

    convertWithMediaRecorder(file)
      .then((result) => updateMethod('webm', result.dataUrl))
      .catch((err) => updateMethod('webm', undefined, err instanceof Error ? err.message : 'Erro WebM'))

    convertAudioWithFallback(file)
      .then((result) => updateMethod('auto', result.dataUrl))
      .catch((err) => updateMethod('auto', undefined, err instanceof Error ? err.message : 'Erro Auto'))
  }

  const handleAudioReset = () => {
    setAudioBase64('')
    setAudioFileName('')
    setAudioMethods([
      { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: false },
      { id: 'ogg', label: 'OGG/Opus', dataUrl: '', error: '', converting: false },
      { id: 'webm', label: 'WebM/Opus (MediaRecorder)', dataUrl: '', error: '', converting: false },
      { id: 'auto', label: 'Auto (fallback)', dataUrl: '', error: '', converting: false },
    ])
  }

  const handleStartCampaign = () => {
    if (!canSend) return

    if (mode === 'text') {
      const hasRecipients = recipients.length > 0
      const hasVariables = hasRecipients && message.includes('{{')
      if (hasVariables) {
        const placeholderNames = extractPlaceholders(message).map((t: { name: string }) => t.name)
        const availableHeaders = Object.keys(recipients[0]?.variables ?? {})
        const validation = validatePlaceholders(
          placeholderNames.map((name: string) => ({ name, start: 0, end: 0 })),
          availableHeaders,
        )
        if (!validation.valid) {
          setCsvError(`Coluna(s) nao disponivel(is): ${validation.unknown.join(', ')}`)
          return
        }
        if (!fallbackMessage.trim()) {
          setCsvError('Forneca uma mensagem fallback para quando variaveis estiverem ausentes')
          return
        }
      }
      const options = hasRecipients
        ? { numbersText: numbers, messageText: message, recipients, fallbackMessage }
        : { numbersText: numbers, messageText: message }
      void startBulkSend(options)
    } else {
      void startBulkSendAudio(numbers, audioBase64)
    }
  }

  const goNext = () => {
    if (step === 1 && canGoToMessage) { setStep(2); setCsvError('') }
    if (step === 2) setStep(3)
  }

  const goPrev = () => {
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
  }

  const handlePause = () => { pauseBulkSend() }
  const handleResume = () => { resumeBulkSend() }
  const handleCancel = () => { resetBulkSend(); setStep(1) }
  const handleReset = () => { resetBulkSend(); setShowLogs(false); setStep(1) }

  const canGoToReview = mode === 'text' ? message.trim().length > 0 : !!audioBase64

  if (phase === 'sending' || phase === 'paused') {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Campanhas</button>
          </div>
          <div className="wizard-status-section">
            <div className="wizard-status-icon">{phase === 'paused' ? '⏸️' : '⚡'}</div>
            <h2 className="wizard-status-title">{phase === 'paused' ? 'PAUSADA' : 'ENVIANDO...'}</h2>
            <ProgressBar prog={progress} />
          </div>
          <div className="wizard-actions">
            {phase === 'paused' ? (
              <>
                <Button onClick={handleResume} disabled={loading} className="button--soft">▶ Retomar</Button>
                <Button onClick={handleCancel} className="button--danger">✕ Cancelar</Button>
              </>
            ) : (
              <Button onClick={handlePause} className="button--secondary">⏸️ Pausar</Button>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (phase === 'completed') {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Campanhas</button>
          </div>
          <div className="wizard-status-section wizard-status-section--done">
            <div className="wizard-done-icon">✅</div>
            <h2 className="wizard-status-title">CONCLUIDO!</h2>
            <div className="wizard-done-stats">
              <div className="wizard-done-stat">
                <span className="wizard-done-stat-value">{progress.sent}</span>
                <span className="wizard-done-stat-label">Enviados</span>
              </div>
              <div className="wizard-done-stat">
                <span className="wizard-done-stat-value">{progress.failed}</span>
                <span className="wizard-done-stat-label">Falhas</span>
              </div>
            </div>
          </div>
          <div className="wizard-actions">
            <Button onClick={() => setShowLogs(!showLogs)} className="button--secondary">
              {showLogs ? 'Esconder logs' : '📋 Ver logs'}
            </Button>
            <Button onClick={handleReset}>✨ Nova campanha</Button>
          </div>
          {showLogs && logs.length > 0 && (
            <div className="wizard-logs">
              <div className="logs-content">
                {logs.map((log, idx) => (
                  <div key={idx} className="log-line">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="wizard-page" role="main">
      <div className="wizard">
        <div className="wizard-header">
          <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
          <span className="wizard-step-count">Passo {step}/3</span>
        </div>

        <div className="wizard-step-indicator">
          {([1, 2, 3] as WizardStep[]).map((s) => (
            <span key={s} className={`wizard-step-dot ${s === step ? 'active' : s < step ? 'done' : ''}`}>
              {s < step ? '✓' : s === step ? '●' : '○'} {STEP_LABELS[s]}
            </span>
          ))}
        </div>

        {csvError && <div className="wizard-error">{csvError}</div>}

        {step === 1 && (
          <div className="wizard-step-content">
            <div className="wizard-block">
              <h3 className="wizard-block-title">📎 Arquivo CSV</h3>
              <p className="wizard-block-hint">Importe seus contatos de um arquivo CSV</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="form-file-input"
              />
              {csvData && (
                <div className="csv-selector">
                  <div className="csv-selector-meta">
                    <span className="status-chip status-chip--neutral">{csvData.rows.length} registros</span>
                    <span className="status-chip status-chip--neutral">{csvData.headers.length} colunas</span>
                  </div>
                  <div className="csv-selector-row">
                    <select
                      value={selectedColumn}
                      onChange={(e) => updatePreview(e.target.value, csvData)}
                      className="form-select"
                    >
                      {csvData.headers.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                    <Button onClick={handleImportColumn} disabled={previewNumbers.length === 0}>
                      Importar
                    </Button>
                  </div>
                  {previewNumbers.length > 0 && (
                    <div className="csv-preview">
                      <div className="preview-header">Previa ({previewNumbers.length} numeros)</div>
                      <div className="preview-content">
                        {previewNumbers.slice(0, 5).map((phone, idx) => (
                          <div key={idx} className={`preview-number ${!isValidPhone(phone) ? 'invalid' : 'valid'}`}>
                            <span className="preview-number-value">{phone}</span>
                            {!isValidPhone(phone) && <span className="preview-number-flag">Invalido</span>}
                          </div>
                        ))}
                        {previewNumbers.length > 5 && (
                          <div className="preview-more">+ {previewNumbers.length - 5} numeros</div>
                        )}
                      </div>
                      {invalidCount > 0 && (
                        <div className="preview-warning">
                          <strong>{invalidCount}</strong> numero(s) invalido(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="wizard-divider"><span>ou</span></div>

            <div className="wizard-block">
              <h3 className="wizard-block-title">📝 Digitar numeros</h3>
              <p className="wizard-block-hint">Cole os numeros separados por virgula</p>
              <textarea
                className="form-textarea"
                placeholder="5511999999999, 5511888888888, ..."
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                rows={3}
              />
            </div>

            {contactCount > 0 && (
              <div className="wizard-summary-bar">
                ✓ {contactCount} numeros adicionados
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step-content">
            <div className="wizard-mode-toggle">
              <button
                type="button"
                className={`wizard-mode-btn ${mode === 'text' ? 'active' : ''}`}
                onClick={() => setMode('text')}
              >
                📝 Texto
              </button>
              <button
                type="button"
                className={`wizard-mode-btn ${mode === 'audio' ? 'active' : ''}`}
                onClick={() => setMode('audio')}
              >
                🎤 Audio
              </button>
            </div>

            {mode === 'text' && (
              <div className="wizard-block">
                <h3 className="wizard-block-title">📝 Mensagem</h3>
                <textarea
                  className="form-textarea"
                  placeholder="Ola! Tudo bem? Escreva sua mensagem aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
                {recipients.length > 0 && Object.keys(recipients[0]?.variables ?? {}).length > 0 && (
                  <div className="variable-chips">
                    <span className="form-hint">Variaveis disponiveis:</span>
                    {Object.keys(recipients[0].variables).map((header) => (
                      <button
                        key={header}
                        type="button"
                        className="variable-chip"
                        onClick={() => setMessage(prev => prev + `{{${header}}}`)}
                      >
                        {`{{${header}}}`}
                      </button>
                    ))}
                  </div>
                )}
                {recipients.length > 0 && (
                  <div className="wizard-block" style={{ marginTop: 12 }}>
                    <h3 className="wizard-block-title">📋 Fallback (opcional)</h3>
                    <p className="wizard-block-hint">Mensagem quando a variavel estiver vazia</p>
                    <textarea
                      className="form-textarea"
                      placeholder="Mensagem alternativa..."
                      value={fallbackMessage}
                      onChange={(e) => setFallbackMessage(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}

            {mode === 'audio' && (
              <div className="wizard-block">
                <h3 className="wizard-block-title">🎤 Audio PTT</h3>
                {!audioFileName && !isConverting && (
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="form-file-input"
                  />
                )}
                {isConverting && (
                  <div className="audio-preview">
                    <div className="audio-preview-meta">
                      <span className="audio-preview-name">{audioFileName}</span>
                      <span className="audio-preview-label">Processando audio...</span>
                    </div>
                    <div className="audio-converting-indicator">
                      <span className="converting-spinner" />
                    </div>
                  </div>
                )}
                {!isConverting && audioBase64 && (
                  <div className="audio-preview">
                    <div className="audio-preview-meta">
                      <span className="audio-preview-name">{audioFileName}</span>
                      <span className="audio-preview-label">Pronto</span>
                    </div>
                    <audio controls src={audioBase64} className="audio-player" />
                    <div className="audio-preview-actions">
                      <button type="button" className="audio-reset-btn" onClick={handleAudioReset}>
                        Remover
                      </button>
                      <button type="button" className="audio-reset-btn" onClick={handleAudioReset}>
                        Trocar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step-content">
            <div className="wizard-review-card">
              <div className="wizard-review-row">
                <span className="wizard-review-icon">👥</span>
                <div className="wizard-review-info">
                  <span className="wizard-review-label">Contatos</span>
                  <span className="wizard-review-value">{contactCount} numeros</span>
                  {contactCount <= 5 && numbers && (
                    <span className="wizard-review-detail">{numbers}</span>
                  )}
                </div>
              </div>

              <div className="wizard-review-row">
                <span className="wizard-review-icon">{mode === 'text' ? '📝' : '🎤'}</span>
                <div className="wizard-review-info">
                  <span className="wizard-review-label">{mode === 'text' ? 'Texto' : 'Audio PTT'}</span>
                  <span className="wizard-review-value">
                    {mode === 'text' ? message.slice(0, 60) + (message.length > 60 ? '...' : '') : audioFileName}
                  </span>
                </div>
              </div>

              <div className="wizard-review-row">
                <span className="wizard-review-icon">⏱️</span>
                <div className="wizard-review-info">
                  <span className="wizard-review-label">Intervalo</span>
                  <span className="wizard-review-value">6-11 segundos entre mensagens</span>
                </div>
              </div>

              <div className="wizard-review-row">
                <span className="wizard-review-icon">🔒</span>
                <div className="wizard-review-info">
                  <span className="wizard-review-label">Modo</span>
                  <span className="wizard-review-value">Humanizado para reduzir bloqueio</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="button"
              onClick={handleStartCampaign}
              disabled={!canSend}
              style={{ marginTop: 16 }}
            >
              🚀 Iniciar campanha
            </button>
            <button
              type="button"
              className="wizard-discard-btn"
              onClick={handleReset}
            >
              ↻ Descartar
            </button>
          </div>
        )}

        <div className="wizard-footer">
          {step > 1 && (
            <button type="button" className="wizard-nav-btn wizard-nav-btn--prev" onClick={goPrev}>
              ← Voltar
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              className="wizard-nav-btn wizard-nav-btn--next"
              onClick={goNext}
              disabled={step === 1 ? !canGoToMessage : !canGoToReview}
            >
              Proximo: {STEP_LABELS[(step + 1) as WizardStep]} →
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
