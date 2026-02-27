import { useState } from 'react'
import { useBulkSend, useWppStatus, type BulkSendProgress } from '@/features'
import { Button } from '@/ui'

export function BulkSendForm() {
  const [numbers, setNumbers] = useState('')
  const [message, setMessage] = useState('')
  const { status: wppStatus } = useWppStatus()
  const { progress, logs, startBulkSend, resetBulkSend } = useBulkSend()

  const isSending = progress.status === 'sending'
  const isCompleted = progress.status === 'completed'
  const canSend = wppStatus.isReady && wppStatus.isAuthenticated && !isSending

  const handleSend = () => {
    if (!canSend) return
    void startBulkSend(numbers, message)
  }

  const handleReset = () => {
    setNumbers('')
    setMessage('')
    resetBulkSend()
  }

  const renderProgress = (prog: BulkSendProgress) => {
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

  return (
    <div className="bulk-send-form">
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

      <div className="form-actions">
        {!isCompleted ? (
          <Button onClick={handleSend} disabled={!canSend || !numbers || !message}>
            {isSending ? 'Enviando...' : 'Iniciar Envio'}
          </Button>
        ) : (
          <Button onClick={handleReset}>Novo Envio</Button>
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
