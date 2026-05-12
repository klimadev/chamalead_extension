import { useState, useRef, useMemo } from 'react'
import { useBulkSend, formatPhoneNumber } from './useBulkSend'
import { useWppStatus } from './useWppStatus'
import type { BulkSendProgress } from './useBulkSend'
import { extractPlaceholders, validatePlaceholders, type CsvRecipient } from './csv-messages'
import { convertToOggOpus, convertWithMediaRecorder, fileToRawDataUrl, convertAudioWithFallback } from './audio-converter'

import { Button } from '@/ui'

interface CsvData {
  headers: string[]
  rows: string[][]
}

const PHONE_KEYWORDS = ['telefone', 'phone', 'celular', 'tel', 'fone', 'whatsapp', 'numero', 'número', 'contato', 'mobile']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function detectPhoneColumn(headers: string[]): string {
  const lowerHeaders = headers.map(h => h.toLowerCase())

  for (const keyword of PHONE_KEYWORDS) {
    const index = lowerHeaders.findIndex(h => h === keyword || h.includes(keyword))
    if (index !== -1) return headers[index]
  }

  return headers[0] || ''
}

function parseCSV(text: string): CsvData {
  // Normalize line endings (handle Windows \r\n)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Parse CSV without splitting by \n first to handle quoted fields with newlines
  const result: CsvData = { headers: [], rows: [] }
  const lines: string[] = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i]

    if (char === '"') {
      // Check for escaped quote ("")
      if (inQuotes && i + 1 < normalizedText.length && normalizedText[i + 1] === '"') {
        currentLine += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim().length > 0) {
        lines.push(currentLine)
      }
      currentLine = ''
    } else {
      currentLine += char
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine)
  }

  if (lines.length === 0) throw new Error('Arquivo CSV vazio')

  // RFC 4180 compliant CSV parser with escaped quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = []
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
        result.push(fieldQuoted ? current : current.trim())
        current = ''
        fieldQuoted = false
      } else {
        current += char
      }
      i++
    }
    result.push(fieldQuoted ? current : current.trim())
    return result
  }

  result.headers = parseLine(lines[0])
  result.rows = lines.slice(1).map((line) => parseLine(line))

  return result
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  // Accept 10-13 digit numbers starting with '55' (Brazilian format)
  return digits.length >= 10 && digits.length <= 13 && digits.startsWith('55')
}

function renderProgress(prog: BulkSendProgress) {
  if (prog.status === 'idle') return null

  const percent = prog.total > 0 ? Math.round(((prog.sent + prog.failed) / prog.total) * 100) : 0

  return (
    <div className="bulk-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-stats">
        <span>Enviados: {prog.sent}</span>
        <span>Falhas: {prog.failed}</span>
        <span>{percent}%</span>
      </div>
      {prog.currentPhone && <div className="current-phone">Enviando para: {prog.currentPhone}</div>}
      {prog.status === 'completed' && <div className="completed-msg">✓ Envio concluído!</div>}
    </div>
  )
}

export function BulkSendForm() {
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'audio'>('text')

  const handleTabChange = (tab: 'text' | 'audio') => {
    setActiveSubTab(tab)
    setCsvError('')
  }
  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [fallbackMessage, setFallbackMessage] = useState('')
  const [audioBase64, setAudioBase64] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [audioMethods, setAudioMethods] = useState<{ id: string; label: string; dataUrl: string; error: string; converting: boolean }[]>([
    { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: false },
    { id: 'ogg', label: 'OGG/Opus (WebCodecs)', dataUrl: '', error: '', converting: false },
    { id: 'webm', label: 'WebM/Opus (MediaRecorder)', dataUrl: '', error: '', converting: false },
    { id: 'auto', label: 'Auto (fallback)', dataUrl: '', error: '', converting: false },
  ])
  const isLoading = useMemo(() => audioMethods.some(m => m.converting), [audioMethods])
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [csvError, setCsvError] = useState<string>('')
  const [previewNumbers, setPreviewNumbers] = useState<string[]>([])
  const [recipients, setRecipients] = useState<CsvRecipient[]>([])
  const fileReaderRef = useRef<FileReader | null>(null)
  const { status: wppStatus } = useWppStatus()
  const { progress, logs, loading, startBulkSend, startBulkSendAudio, pauseBulkSend, resumeBulkSend, resetBulkSend } = useBulkSend()

  const isSending = progress.status === 'sending'
  const isPaused = progress.status === 'paused'
  const isCompleted = progress.status === 'completed'
  const canSend = wppStatus.isReady && wppStatus.isAuthenticated && !isSending && !isPaused
  const [showLogs, setShowLogs] = useState(false)

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvError('')
    setCsvData(null)
    setSelectedColumn('')
    setPreviewNumbers([])

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setCsvError('Arquivo muito grande. Tamanho máximo: 5MB')
      return
    }

    // Abort previous FileReader if exists
    if (fileReaderRef.current) {
      fileReaderRef.current.abort()
    }

    const reader = new FileReader()
    fileReaderRef.current = reader

    reader.onload = (event) => {
      fileReaderRef.current = null
      try {
        const result = event.target?.result
        if (!result || typeof result !== 'string') {
          setCsvError('Erro: arquivo vazio ou inválido')
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

    reader.onabort = () => {
      if (fileReaderRef.current === reader) {
        fileReaderRef.current = null
      }
    }

    reader.onerror = () => {
      if (fileReaderRef.current === reader) {
        fileReaderRef.current = null
      }
      setCsvError('Erro ao ler o arquivo')
    }

    reader.readAsText(file)
  }

  const handleImportColumn = () => {
    if (!csvData || !selectedColumn || previewNumbers.length === 0) return

    const validPhones = previewNumbers.filter(p => isValidPhone(p))
    if (validPhones.length === 0) {
      setCsvError('Nenhum número válido encontrado na coluna selecionada')
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
        if (header !== selectedColumn) {
          variables[header] = row[i] || ''
        }
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

  const handleSend = () => {
    if (!canSend) return

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
        setCsvError(`Coluna(s) não disponível(is): ${validation.unknown.join(', ')}`)
        return
      }

      if (!fallbackMessage.trim()) {
        setCsvError('Forneça uma mensagem fallback para quando variáveis estiverem ausentes')
        return
      }
    }

    const options = hasRecipients
      ? { numbersText: numbers, messageText: message, recipients, fallbackMessage }
      : { numbersText: numbers, messageText: message }

    void startBulkSend(options)
  }

  const invalidCount = useMemo(() =>
    previewNumbers.filter(p => !isValidPhone(p)).length,
    [previewNumbers]
  )

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
      if (best) {
        setAudioBase64(best.dataUrl)
      }
      const allDone = methods.every((m) => !m.converting)
      if (allDone && !best) {
        setCsvError('Nao foi possivel processar o audio. Tente outro arquivo.')
      }
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

    // RAW (sem conversão)
    fileToRawDataUrl(file)
      .then((dataUrl) => {
        updateMethod('raw', dataUrl)
      })
      .catch((err) => {
        updateMethod('raw', undefined, err instanceof Error ? err.message : 'Erro RAW')
      })

    // OGG/Opus (WebCodecs)
    convertToOggOpus(file)
      .then((result) => {
        updateMethod('ogg', result.dataUrl)
      })
      .catch((err) => {
        updateMethod('ogg', undefined, err instanceof Error ? err.message : 'Erro OGG')
      })

    // WebM/Opus (MediaRecorder)
    convertWithMediaRecorder(file)
      .then((result) => {
        updateMethod('webm', result.dataUrl)
      })
      .catch((err) => {
        updateMethod('webm', undefined, err instanceof Error ? err.message : 'Erro WebM')
      })

    // Auto (fallback pipeline)
    convertAudioWithFallback(file)
      .then((result) => {
        updateMethod('auto', result.dataUrl)
      })
      .catch((err) => {
        updateMethod('auto', undefined, err instanceof Error ? err.message : 'Erro Auto')
      })
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

  const handleSendAudio = () => {
    if (!canSend) return
    void startBulkSendAudio(numbers, audioBase64)
  }

  const activeModeLabel = activeSubTab === 'text' ? 'Campanha de texto' : 'Campanha de áudio'
  const contactCount = numbers
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length

  return (
    <div className="bulk-send-form">
      {isCompleted ? (
        <section className="campaign-section" aria-label="Campanha concluida">
          <div className="section-header">
            <div>
              <p className="section-kicker">Concluido</p>
              <h3 className="section-title">Campanha finalizada</h3>
            </div>
            <div className="status-chip status-chip--success">Concluida</div>
          </div>
          <div className="bulk-info">
            <p>Enviados: {progress.sent} | Falhas: {progress.failed}</p>
          </div>
          <div className="form-actions">
            <Button onClick={() => { setShowLogs(!showLogs) }} className="button--secondary">
              {showLogs ? 'Esconder logs' : 'Ver logs'}
            </Button>
            <Button onClick={resetBulkSend}>Nova campanha</Button>
          </div>
        </section>
      ) : (
        <>
          {isSending || isPaused ? (
            <section className="campaign-section" aria-label="Resumo da campanha">
              <div className="section-header">
                <div>
                  <p className="section-kicker">{isPaused ? 'Pausada' : 'Enviando'}</p>
                  <h3 className="section-title">Campanha em andamento</h3>
                </div>
                <div className={`status-chip ${isPaused ? 'status-chip--warning' : 'status-chip--neutral'}`}>
                  {isPaused ? 'Pausada' : `${contactCount} numeros`}
                </div>
              </div>
              <p className="muted">{activeModeLabel} — {contactCount} numeros</p>
            </section>
          ) : (
            <>
              <section className="campaign-section campaign-type-section" aria-label="Tipo de campanha">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Preparacao</p>
                    <h3 className="section-title">Tipo de campanha</h3>
                  </div>
                  <div className="status-chip status-chip--neutral">{activeModeLabel}</div>
                </div>
                <div className="bulk-sub-tabs" role="tablist" aria-label="Tipo de envio">
                  <button
                    type="button"
                    className={`sub-tab-btn ${activeSubTab === 'text' ? 'active' : ''}`}
                    onClick={() => handleTabChange('text')}
                    disabled={isSending}
                    aria-pressed={activeSubTab === 'text'}
                  >
                    Texto Massivo
                  </button>
                  <button
                    type="button"
                    className={`sub-tab-btn ${activeSubTab === 'audio' ? 'active' : ''}`}
                    onClick={() => handleTabChange('audio')}
                    disabled={isSending}
                    aria-pressed={activeSubTab === 'audio'}
                  >
                    Audio Massivo
                  </button>
                </div>
              </section>

              <section className="campaign-section" aria-label="Fonte de contatos">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Contato</p>
                    <h3 className="section-title">Fonte de contatos</h3>
                  </div>
                  <div className="status-chip status-chip--neutral">
                    {contactCount ? `${contactCount} numeros` : 'Nenhum numero'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Importar CSV (opcional)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isSending}
                    className="form-file-input"
                  />
                  {csvError && <span className="form-error">{csvError}</span>}
                  {csvData && (
                    <div className="csv-selector">
                      <div className="csv-selector-meta">
                        <span className="status-chip status-chip--neutral">{csvData.rows.length} registros</span>
                        <span className="status-chip status-chip--neutral">{csvData.headers.length} colunas</span>
                      </div>
                      <label className="form-label">Coluna com telefones</label>
                      <div className="csv-selector-row">
                        <select
                          value={selectedColumn}
                          onChange={(e) => updatePreview(e.target.value, csvData)}
                          className="form-select"
                          disabled={isSending}
                        >
                          {csvData.headers.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                        <Button onClick={handleImportColumn} disabled={isSending || previewNumbers.length === 0}>
                          Confirmar importacao
                        </Button>
                      </div>
                      <span className="form-hint">{csvData.rows.length} registro(s) encontrado(s)</span>
                      {previewNumbers.length > 0 && (
                        <div className="csv-preview">
                          <div className="preview-header">
                            Previa ({previewNumbers.length} numeros formatados)
                          </div>
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
                              <strong>{invalidCount}</strong> numero(s) invalido(s) detectado(s)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Numeros (separados por virgula)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="5511999999999, 5511888888888, ..."
                    value={numbers}
                    onChange={(e) => setNumbers(e.target.value)}
                    disabled={isSending}
                    rows={3}
                  />
                  <span className="form-hint">Ex: 5511999999999, 5511888888888</span>
                </div>
              </section>

              <section className="campaign-section" aria-label="Conteudo da campanha">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Conteudo</p>
                    <h3 className="section-title">{activeSubTab === 'text' ? 'Mensagem de texto' : 'Audio PTT'}</h3>
                  </div>
                  <div className="status-chip status-chip--neutral">Pronto para editar</div>
                </div>

                {activeSubTab === 'text' && (
                  <div className="form-group">
                    <label className="form-label">Mensagem</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Digite sua mensagem..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSending}
                      rows={4}
                    />
                    <span className="form-hint">A mensagem sera enviada para cada contato da campanha.</span>
                    {recipients.length > 0 && Object.keys(recipients[0]?.variables ?? {}).length > 0 && (
                      <div className="variable-chips">
                        <span className="form-hint">Colunas disponiveis:</span>
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
                  </div>
                )}

                {activeSubTab === 'text' && recipients.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Mensagem fallback</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Mensagem alternativa quando variavel estiver vazia..."
                      value={fallbackMessage}
                      onChange={(e) => setFallbackMessage(e.target.value)}
                      disabled={isSending}
                      rows={3}
                    />
                    <span className="form-hint">Esta mensagem sera enviada quando alguma variavel estiver vazia.</span>
                  </div>
                )}

                {activeSubTab === 'audio' && (
                  <div className="form-group">
                    <label className="form-label">Audio PTT</label>

                    {!audioFileName && !isLoading && (
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioUpload}
                        disabled={isSending}
                        className="form-file-input"
                      />
                    )}

                    {isLoading && (
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

                    {!isLoading && audioBase64 && (
                      <div className="audio-preview">
                        <div className="audio-preview-meta">
                          <span className="audio-preview-name">{audioFileName}</span>
                          <span className="audio-preview-label">Pronto</span>
                        </div>
                        <audio controls src={audioBase64} className="audio-player" />
                        <div className="audio-preview-actions">
                          <button type="button" className="audio-reset-btn" onClick={handleAudioReset} disabled={isSending}>
                            Remover
                          </button>
                          <button type="button" className="audio-reset-btn" onClick={() => {
                            handleAudioReset()
                          }} disabled={isSending}>
                            Trocar
                          </button>
                        </div>
                      </div>
                    )}

                    {csvError && <span className="form-error">{csvError}</span>}
                  </div>
                )}
              </section>
            </>
          )}

          <details className="campaign-section safety-details" aria-label="Seguranca">
            <summary className="safety-summary">
              <span>Seguranca: 6-11s entre mensagens · Modo humanizado</span>
            </summary>
            <div className="bulk-info" style={{ marginTop: 8 }}>
              <p>⏱️ Intervalo: 6-11 segundos entre mensagens</p>
              <p>🔒 Envio humanizado para reduzir risco de bloqueio</p>
            </div>
          </details>

          <div className="campaign-actions-sticky">
            <div className="form-actions campaign-actions">
              {isPaused ? (
                <>
                  <Button onClick={resumeBulkSend} disabled={loading} className="button--soft">
                    Retomar envio
                  </Button>
                  <Button onClick={resetBulkSend} className="button--danger">
                    Cancelar
                  </Button>
                </>
              ) : isSending ? (
                <Button onClick={pauseBulkSend} className="button--secondary">
                  Pausar
                </Button>
              ) : (
                <Button
                  onClick={activeSubTab === 'text' ? handleSend : handleSendAudio}
                  disabled={
                    !canSend ||
                    !numbers ||
                    (activeSubTab === 'text' ? !message : !audioBase64)
                  }
                >
                  Iniciar campanha
                </Button>
              )}
            </div>
          </div>

          {(isSending || isPaused || (progress.status !== 'idle' && progress.status !== 'completed')) && (
            <section className="campaign-section" aria-label="Progresso da campanha">
              {renderProgress(progress)}
            </section>
          )}
        </>
      )}

      {showLogs && logs.length > 0 && (
        <section className="campaign-section" aria-label="Logs da campanha">
          <div className="section-header">
            <div>
              <p className="section-kicker">Operacao</p>
              <h3 className="section-title">Logs</h3>
            </div>
            <div className="status-chip status-chip--neutral">{logs.length} entradas</div>
          </div>
          <div className="bulk-logs">
            <div className="logs-content">
              {logs.map((log, idx) => (
                <div key={idx} className="log-line">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

