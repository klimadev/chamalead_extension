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
  const [selectedAudioMethod, setSelectedAudioMethod] = useState('')
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
      setCsvError('Arquivo de áudio muito grande. Tamanho máximo: 5MB')
      return
    }

    setCsvError('')
    setAudioFileName(file.name)
    setAudioBase64('')
    setSelectedAudioMethod('')

    setAudioMethods([
      { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: true },
      { id: 'ogg', label: 'OGG/Opus (WebCodecs)', dataUrl: '', error: '', converting: true },
      { id: 'webm', label: 'WebM/Opus (MediaRecorder)', dataUrl: '', error: '', converting: true },
      { id: 'auto', label: 'Auto (fallback)', dataUrl: '', error: '', converting: true },
    ])

    // RAW (sem conversão)
    fileToRawDataUrl(file)
      .then((dataUrl) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'raw' ? { ...m, dataUrl, error: '', converting: false } : m)))
      })
      .catch((err) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'raw' ? { ...m, dataUrl: '', error: err instanceof Error ? err.message : 'Erro RAW', converting: false } : m)))
      })

    // OGG/Opus (WebCodecs)
    convertToOggOpus(file)
      .then((result) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'ogg' ? { ...m, dataUrl: result.dataUrl, error: '', converting: false } : m)))
      })
      .catch((err) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'ogg' ? { ...m, dataUrl: '', error: err instanceof Error ? err.message : 'Erro OGG', converting: false } : m)))
      })

    // WebM/Opus (MediaRecorder)
    convertWithMediaRecorder(file)
      .then((result) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'webm' ? { ...m, dataUrl: result.dataUrl, error: '', converting: false } : m)))
      })
      .catch((err) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'webm' ? { ...m, dataUrl: '', error: err instanceof Error ? err.message : 'Erro WebM', converting: false } : m)))
      })

    // Auto (fallback pipeline)
    convertAudioWithFallback(file)
      .then((result) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'auto' ? { ...m, dataUrl: result.dataUrl, error: '', converting: false } : m)))
      })
      .catch((err) => {
        setAudioMethods((prev) => prev.map((m) => (m.id === 'auto' ? { ...m, dataUrl: '', error: err instanceof Error ? err.message : 'Erro Auto', converting: false } : m)))
      })
  }

  const handleAudioReset = () => {
    setAudioBase64('')
    setAudioFileName('')
    setSelectedAudioMethod('')
    setAudioMethods([
      { id: 'raw', label: 'RAW (direto)', dataUrl: '', error: '', converting: false },
      { id: 'ogg', label: 'OGG/Opus (WebCodecs)', dataUrl: '', error: '', converting: false },
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
      <section className="campaign-section campaign-type-section" aria-label="Tipo de campanha">
        <div className="section-header">
          <div>
            <p className="section-kicker">Preparação</p>
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
            Áudio Massivo
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
            {contactCount ? `${contactCount} números` : 'Nenhum número'}
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
                  Confirmar importação
                </Button>
              </div>
              <span className="form-hint">{csvData.rows.length} registro(s) encontrado(s)</span>
              {previewNumbers.length > 0 && (
                <div className="csv-preview">
                  <div className="preview-header">
                    Prévia ({previewNumbers.length} números formatados)
                  </div>
                  <div className="preview-content">
                    {previewNumbers.slice(0, 5).map((phone, idx) => (
                      <div key={idx} className={`preview-number ${!isValidPhone(phone) ? 'invalid' : 'valid'}`}>
                        <span className="preview-number-value">{phone}</span>
                        {!isValidPhone(phone) && <span className="preview-number-flag">Inválido</span>}
                      </div>
                    ))}
                    {previewNumbers.length > 5 && (
                      <div className="preview-more">+ {previewNumbers.length - 5} números</div>
                    )}
                  </div>
                  {invalidCount > 0 && (
                    <div className="preview-warning">
                      <strong>{invalidCount}</strong> número(s) inválido(s) detectado(s)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Números (separados por vírgula)</label>
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

      <section className="campaign-section" aria-label="Conteúdo da campanha">
        <div className="section-header">
          <div>
            <p className="section-kicker">Conteúdo</p>
            <h3 className="section-title">{activeSubTab === 'text' ? 'Mensagem de texto' : 'Áudio PTT'}</h3>
          </div>
          <div className="status-chip status-chip--neutral">{isSending ? 'Bloqueado durante envio' : 'Pronto para editar'}</div>
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
            <span className="form-hint">A mensagem será enviada para cada contato da campanha.</span>
            {recipients.length > 0 && Object.keys(recipients[0]?.variables ?? {}).length > 0 && (
              <div className="variable-chips">
                <span className="form-hint">Colunas disponíveis:</span>
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
              placeholder="Mensagem alternativa quando variável estiver vazia..."
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              disabled={isSending}
              rows={3}
            />
            <span className="form-hint">Esta mensagem será enviada quando alguma variável estiver vazia.</span>
          </div>
        )}

        {activeSubTab === 'audio' && (
          <div className="form-group">
            <label className="form-label">Áudio (PTT) — Multi-método</label>

            {!audioBase64 && !isLoading && (
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
                  <span className="audio-preview-label">Convertendo...</span>
                </div>
                <div className="audio-converting-indicator">
                  <span className="converting-spinner" />
                  <span>Convertendo áudio (4 métodos em paralelo)...</span>
                </div>
              </div>
            )}

            {audioMethods.some((m) => m.dataUrl) && (
              <div className="audio-preview">
                <div className="audio-preview-meta">
                  <span className="audio-preview-name">{audioFileName}</span>
                  <span className="audio-preview-label">Selecione o método para envio</span>
                </div>

                <div className="audio-methods-list">
                  {audioMethods.map((method) => {
                    const isSelected = selectedAudioMethod === method.id
                    return (
                      <div key={method.id} className={`audio-method-card ${isSelected ? 'selected' : ''}`}>
                        <div className="audio-method-header">
                          <span className="audio-method-name">{method.label}</span>
                          <span className={`audio-method-status ${method.error ? 'error' : method.dataUrl ? 'success' : 'pending'}`}>
                            {method.converting
                              ? 'Convertendo...'
                              : method.error
                                ? `✗ ${method.error}`
                                : method.dataUrl
                                  ? '✓ Pronto'
                                  : '—'}
                          </span>
                        </div>
                        {method.dataUrl && (
                          <div className="audio-method-player">
                            <audio controls src={method.dataUrl} className="audio-player" style={{ width: '100%' }} />
                          </div>
                        )}
                        <div className="audio-method-actions">
                          <button
                            type="button"
                            className={`audio-method-select ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedAudioMethod(method.id)
                              setAudioBase64(method.dataUrl)
                            }}
                            disabled={!method.dataUrl || isSending}
                          >
                            {isSelected ? '✓ Selecionado para envio' : 'Selecionar para envio'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="audio-reset-btn"
                  onClick={handleAudioReset}
                  disabled={isSending}
                >
                  Remover
                </button>
              </div>
            )}

            {csvError && <span className="form-error">{csvError}</span>}
          </div>
        )}
      </section>

      <section className="campaign-section" aria-label="Segurança e execução">
        <div className="section-header">
          <div>
            <p className="section-kicker">Segurança</p>
            <h3 className="section-title">Contexto operacional</h3>
          </div>
        </div>
        <div className="bulk-info">
          <p>⏱️ Intervalo: 6-11 segundos entre mensagens</p>
          <p>🔒 Envio humanizado para reduzir risco de bloqueio</p>
        </div>
      </section>

      <section className="campaign-section" aria-label="Ações da campanha">
        <div className="section-header">
          <div>
            <p className="section-kicker">Execução</p>
            <h3 className="section-title">Ações</h3>
          </div>
          <div className={`status-chip ${isCompleted ? 'status-chip--success' : isPaused ? 'status-chip--warning' : isSending ? 'status-chip--neutral' : 'status-chip--neutral'}`}>
            {isCompleted ? 'Concluída' : isPaused ? 'Pausada' : isSending ? 'Enviando' : 'Aguardando'}
          </div>
        </div>

        <div className="form-actions campaign-actions">
          {isPaused ? (
            <Button onClick={resumeBulkSend} disabled={loading} className="button--soft">
              Retomar envio
            </Button>
          ) : !isCompleted ? (
            <Button
              onClick={activeSubTab === 'text' ? handleSend : handleSendAudio}
              disabled={
                !canSend ||
                !numbers ||
                (activeSubTab === 'text' ? !message : !audioBase64)
              }
            >
              {isSending ? 'Enviando...' : 'Iniciar envio'}
            </Button>
          ) : (
            <Button onClick={resetBulkSend} className="button--soft">Novo envio</Button>
          )}
          {isSending && (
            <Button onClick={pauseBulkSend} className="button--secondary">
              Pausar
            </Button>
          )}
          {isPaused && (
            <Button onClick={resetBulkSend} className="button--danger">
              Cancelar
            </Button>
          )}
        </div>
      </section>

      <section className="campaign-section" aria-label="Progresso da campanha">
        <div className="section-header">
          <div>
            <p className="section-kicker">Feedback</p>
            <h3 className="section-title">Progresso</h3>
          </div>
        </div>
        {renderProgress(progress)}
      </section>

      {logs.length > 0 && (
        <section className="campaign-section" aria-label="Logs da campanha">
          <div className="section-header">
            <div>
              <p className="section-kicker">Operação</p>
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
