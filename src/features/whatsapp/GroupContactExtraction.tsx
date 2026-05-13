import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/ui'
import { useGroupExtraction, type ParticipantRow } from './useGroupExtraction'
import { type WppStatus } from './useWppStatus'

interface Props {
  wppStatus: WppStatus
  onBack: () => void
}

interface SkippedGroup {
  name: string
  reason: string
}

export function GroupContactExtraction({ wppStatus, onBack }: Props) {
  const { groups, isLoading, error, fetchGroups, extractParticipants } =
    useGroupExtraction()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [phase, setPhase] = useState<'loading' | 'select' | 'extracting' | 'done'>('loading')
  const [summary, setSummary] = useState<{
    totalContacts: number
    groupsProcessed: number
    groupsSkipped: SkippedGroup[]
  } | null>(null)
  const [resultRows, setResultRows] = useState<ParticipantRow[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const wppReady = wppStatus.isReady && wppStatus.isAuthenticated

  useEffect(() => {
    if (!wppReady) return

    void (async () => {
      await fetchGroups()
      setPhase('select')
    })()
  }, [wppReady, fetchGroups])

  const toggleGroup = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === groups.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(groups.map((g) => g.id)))
    }
  }, [selectedIds.size, groups])

  const allSelected = groups.length > 0 && selectedIds.size === groups.length

  const handleExtract = useCallback(async () => {
    if (selectedIds.size === 0) return

    setPhase('extracting')
    setProgress({ current: 0, total: selectedIds.size })

    const selectedArray = Array.from(selectedIds)
    const rows: ParticipantRow[] = []
    const skipped: SkippedGroup[] = []

    for (let i = 0; i < selectedArray.length; i++) {
      const groupId = selectedArray[i]
      setProgress({ current: i + 1, total: selectedArray.length })

      const result = await extractParticipants(groupId)
      if (result.error) {
        skipped.push({
          name: groups.find((g) => g.id === groupId)?.name || groupId,
          reason: result.error,
        })
      } else if (result.participants.length === 0) {
        skipped.push({
          name: groups.find((g) => g.id === groupId)?.name || groupId,
          reason: '0 participantes',
        })
      }
      rows.push(...result.participants)
    }

    setResultRows(rows)
    setSummary({
      totalContacts: rows.length,
      groupsProcessed: selectedArray.length - skipped.length,
      groupsSkipped: skipped,
    })
    setPhase('done')
  }, [selectedIds, extractParticipants, groups])

  const handleDownload = useCallback(() => {
    const header = 'group_name,phone,is_admin'
    const lines = resultRows.map((row) => {
      const name = row.group_name.includes(',') || row.group_name.includes('"')
        ? `"${row.group_name.replace(/"/g, '""')}"`
        : row.group_name
      return `${name},${row.phone},${row.is_admin}`
    })
    const csv = [header, ...lines].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'chamalead_contatos.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [resultRows])

  const handleReset = useCallback(() => {
    setSelectedIds(new Set())
    setSummary(null)
    setResultRows([])
    setPhase('select')
  }, [])

  if (!wppReady) {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
          </div>
          <div className="wizard-status-section wizard-status-section--neutral">
            <div className="wizard-status-icon">🔒</div>
            <h2 className="wizard-status-title">Conecte ao WhatsApp</h2>
            <p className="muted">Abra o WhatsApp Web para listar seus grupos.</p>
          </div>
        </div>
      </main>
    )
  }

  if (phase === 'loading' || isLoading) {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
          </div>
          <Card title="Extrair Contatos">
            <p className="muted">Carregando grupos...</p>
          </Card>
        </div>
      </main>
    )
  }

  if (phase === 'select' && groups.length === 0) {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
          </div>
          <Card title="Extrair Contatos">
            <p className="muted">{error || 'Nenhum grupo encontrado'}</p>
            <button type="button" className="button" onClick={() => void fetchGroups()}>
              Tentar novamente
            </button>
          </Card>
        </div>
      </main>
    )
  }

  if (phase === 'done' && summary) {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
          </div>
          <Card title="Extracao concluida">
            <div style={{ padding: '8px 0' }}>
              <p><strong>{summary.totalContacts}</strong> contatos extraidos</p>
              <p>{summary.groupsProcessed} grupos processados</p>
              {summary.groupsSkipped.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className="muted" style={{ marginBottom: 4 }}>Pulados:</p>
                  {summary.groupsSkipped.map((sg) => (
                    <p key={sg.name} className="muted" style={{ fontSize: '0.8rem', marginBottom: 2 }}>
                      {sg.name} — {sg.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="button" onClick={handleDownload}>
                Baixar CSV
              </button>
              <button type="button" className="button" onClick={handleReset}>
                Extrair mais
              </button>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="wizard-page" role="main">
      <div className="wizard">
        <div className="wizard-header">
          <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
        </div>
        <Card title="Extrair Contatos">
          {phase === 'extracting' ? (
            <div style={{ padding: '8px 0' }}>
              <p className="muted">
                Extraindo contatos... ({progress.current}/{progress.total})
              </p>
              <p className="muted">Aguarde enquanto processamos os grupos selecionados.</p>
            </div>
          ) : (
            <>
              <p style={{ marginBottom: 8, fontSize: '0.85rem' }} className="muted">
                Selecione os grupos para extrair contatos:
              </p>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ marginRight: 6 }}
                  />
                  Selecionar todos ({groups.length} grupos)
                </label>
              </div>
              <div
                style={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                {groups.map((g) => (
                  <label
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      style={{ marginRight: 6 }}
                    />
                    {g.name || g.id}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="button"
                disabled={selectedIds.size === 0}
                style={{ marginTop: 12, width: '100%' }}
                onClick={() => void handleExtract()}
              >
                Extrair {selectedIds.size} grupo{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
