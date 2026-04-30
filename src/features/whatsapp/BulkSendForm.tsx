import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useBulkSend, useWppStatus, type BulkSendProgress, formatPhoneNumber } from '@/features'
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

  useEffect(() => {
    setCsvError('')
  }, [activeSubTab])
  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const [audioBase64, setAudioBase64] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [csvError, setCsvError] = useState<string>('')
  const [previewNumbers, setPreviewNumbers] = useState<string[]>([])
  const fileReaderRef = useRef<FileReader | null>(null)
  const audioFileReaderRef = useRef<FileReader | null>(null)
  const { status: wppStatus } = useWppStatus()
  const { progress, logs, startBulkSend, startBulkSendAudio, resetBulkSend } = useBulkSend()

  const isSending = progress.status === 'sending'
  const isCompleted = progress.status === 'completed'
  const canSend = wppStatus.isReady && wppStatus.isAuthenticated && !isSending

  const updatePreview = useCallback((col: string, data?: CsvData) => {
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
  }, [csvData])

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

    const phones = validPhones.join(', ')

    setNumbers((prev) => prev ? `${prev}, ${phones}` : phones)
    setCsvData(null)
    setSelectedColumn('')
    setPreviewNumbers([])
    setCsvError('')
  }

  const handleSend = () => {
    if (!canSend) return
    void startBulkSend(numbers, message)
  }


  const handleResetAll = () => {
    setNumbers('')
    setMessage('')
    setAudioBase64('')
    setAudioFileName('')
    setCsvData(null)
    setSelectedColumn('')
    setPreviewNumbers([])
    setCsvError('')
    resetBulkSend()
  }

  const invalidCount = useMemo(() =>
    previewNumbers.filter(p => !isValidPhone(p)).length,
    [previewNumbers]
  )

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setCsvError('Arquivo de áudio muito grande. Tamanho máximo: 5MB')
      return
    }

    if (audioFileReaderRef.current) {
      audioFileReaderRef.current.abort()
    }

    const reader = new FileReader()
    audioFileReaderRef.current = reader

    reader.onload = (event) => {
      audioFileReaderRef.current = null
      const result = event.target?.result
      if (!result || typeof result !== 'string') {
        setCsvError('Erro ao ler arquivo de áudio')
        return
      }

      const mimeType = file.type || 'audio/ogg'
      const base64 = result.split(',')[1] || result
      const fullBase64 = `data:${mimeType};base64,${base64}`

      setAudioBase64(fullBase64)
      setAudioFileName(file.name)
      setCsvError('')
    }

    reader.onabort = () => {
      if (audioFileReaderRef.current === reader) {
        audioFileReaderRef.current = null
      }
    }

    reader.onerror = () => {
      if (audioFileReaderRef.current === reader) {
        audioFileReaderRef.current = null
      }
      setCsvError('Erro ao ler arquivo de áudio')
    }

    reader.readAsDataURL(file)
  }

  const handleAudioReset = () => {
    setAudioBase64('')
    setAudioFileName('')
    if (audioFileReaderRef.current) {
      audioFileReaderRef.current.abort()
      audioFileReaderRef.current = null
    }
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.stop() } catch (e) { }
      mediaRecorderRef.current = null
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setRecordingTime(0)
    recordingChunksRef.current = []
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
      let selectedMimeType = ''

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined)
      recordingChunksRef.current = []

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: selectedMimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          setAudioBase64(result)
          setAudioFileName(`gravacao_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`)
          setCsvError('')
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((prev: number) => prev + 1)
      }, 1000)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      setCsvError(`Erro ao acessar microfone: ${errMsg}. Verifique se a permissão está ativada em chrome://settings/content/microphone`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
    }
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop() } catch (e) { }
      }
    }
  }, [])

  const handleSendAudio = () => {
    if (!canSend) return
    void startBulkSendAudio(numbers, audioBase64)
  }

  return (
    <div className="bulk-send-form">
      <div className="bulk-sub-tabs">
        <button
          className={`sub-tab-btn ${activeSubTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('text')}
          disabled={isSending}
        >
          Texto Massivo
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('audio')}
          disabled={isSending}
        >
          Áudio Massivo
        </button>
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
            <label className="form-label">Coluna com telefones:</label>
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
                Confirmar Importação
              </Button>
            </div>
            <span className="form-hint">
              {csvData.rows.length} registro(s) encontrado(s)
            </span>
            {previewNumbers.length > 0 && (
              <div className="csv-preview">
                <div className="preview-header">
                  Preview ({previewNumbers.length} números formatados):
                </div>
                <div className="preview-content">
                  {previewNumbers.slice(0, 5).map((phone, idx) => (
                    <div key={idx} className={`preview-number ${!isValidPhone(phone) ? 'invalid' : 'valid'}`}>
                      {phone} {!isValidPhone(phone) && '(inválido)'}
                    </div>
                  ))}
                  {previewNumbers.length > 5 && (
                    <div className="preview-more">... e mais {previewNumbers.length - 5} números</div>
                  )}
                </div>
                {invalidCount > 0 && (
                  <div className="preview-warning">
                    ⚠️ {invalidCount} número(s) inválido(s) (devem ter 10-13 dígitos com 55)
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
        </div>
      )}

      {activeSubTab === 'audio' && (
        <div className="form-group">
          <label className="form-label">Áudio (PTT)</label>

          {!isRecording && !audioBase64 && (
            <div className="recording-options">
              <button
                type="button"
                className="record-btn"
                onClick={startRecording}
                disabled={isSending}
              >
                🎙️ Gravar Áudio
              </button>
              <span className="form-hint" style={{ margin: '8px 0' }}>ou</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                disabled={isSending}
                className="form-file-input"
              />
            </div>
          )}

          {isRecording && (
            <div className="recording-controls">
              <div className="recording-status">
                <span className="recording-indicator">🔴 Gravando...</span>
                <span className="recording-timer">{formatTime(recordingTime)}</span>
              </div>
              <div className="recording-buttons">
                <button type="button" className="stop-btn" onClick={stopRecording}>
                  ⏹️ Parar
                </button>
                {mediaRecorderRef.current?.state === 'recording' ? (
                  <button type="button" className="pause-btn" onClick={pauseRecording}>
                    ⏸️ Pausar
                  </button>
                ) : (
                  <button type="button" className="resume-btn" onClick={resumeRecording}>
                    ▶️ Continuar
                  </button>
                )}
              </div>
            </div>
          )}

          {audioFileName && !isRecording && (
            <div className="audio-preview">
              <span>Arquivo: {audioFileName}</span>
              <audio controls src={audioBase64} style={{ marginLeft: '8px', height: '30px' }} />
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

      <div className="form-actions">
        {!isCompleted ? (
          <Button
            onClick={activeSubTab === 'text' ? handleSend : handleSendAudio}
            disabled={
              !canSend ||
              !numbers ||
              (activeSubTab === 'text' ? !message : !audioBase64)
            }
          >
            {isSending ? 'Enviando...' : 'Iniciar Envio'}
          </Button>
        ) : (
          <Button onClick={handleResetAll}>Novo Envio</Button>
        )}
      </div>

      {renderProgress(progress)}

      {logs.length > 0 && (
        <div className="bulk-logs">
          <div className="logs-header">Logs</div>
          <div className="logs-content">
            {logs.map((log, idx) => (
              <div key={idx} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bulk-info">
        <p>⏱️ Intervalo: 6-11 segundos entre mensagens</p>
        <p>🔒 Envio humanizado para evitar bloqueios</p>
      </div>
    </div>
  )
}
