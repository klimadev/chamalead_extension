import { useState } from 'react'
import { Card } from '@/ui'
import type { AnalyticsResponse, CampaignSummary } from '@/extension/db'

function formatCount(sent: number, failed: number): string {
  const total = sent + failed
  if (total === 0) return '0'
  return `${sent}/${total}`
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function SummaryCards({ analytics }: { analytics: AnalyticsResponse }) {
  const { today, week, total } = analytics.summary

  return (
    <div className="analytics-summary-cards">
      <div className="analytics-card analytics-card--today">
        <span className="analytics-card-label">Hoje</span>
        <span className="analytics-card-value">{formatCount(today.sent, today.failed)}</span>
        <span className="analytics-card-detail">{today.failed > 0 ? `${today.failed} falhas` : '100% sucesso'}</span>
      </div>
      <div className="analytics-card analytics-card--week">
        <span className="analytics-card-label">7 dias</span>
        <span className="analytics-card-value">{formatCount(week.sent, week.failed)}</span>
        <span className="analytics-card-detail">{week.sent + week.failed} envios</span>
      </div>
      <div className="analytics-card analytics-card--total">
        <span className="analytics-card-label">Total</span>
        <span className="analytics-card-value">{formatCount(total.sent, total.failed)}</span>
        <span className="analytics-card-detail">{total.sent + total.failed} historico</span>
      </div>
    </div>
  )
}

function HourlyChart({ hourly }: { hourly: AnalyticsResponse['hourly'] }) {
  if (hourly.length === 0) {
    return (
      <div className="analytics-empty">
        <p className="muted">Nenhuma atividade hoje.</p>
      </div>
    )
  }

  const maxCount = Math.max(...hourly.map((h) => h.sent + h.failed), 1)

  return (
    <div className="analytics-chart">
      <h4 className="analytics-chart-title">Atividade por hora (hoje)</h4>
      <div className="analytics-bars">
        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
          const bucket = hourly.find((h) => h.hour === hour)
          const count = bucket ? bucket.sent + bucket.failed : 0
          const pct = (count / maxCount) * 100

          return (
            <div key={hour} className="analytics-bar-col" title={`${formatHour(hour)}: ${count} envios`}>
              <span className="analytics-bar-label">{hour.toString().padStart(2, '0')}</span>
              <div className="analytics-bar-track">
                <div
                  className="analytics-bar-fill"
                  style={{ height: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CampaignList({ campaigns }: { campaigns: CampaignSummary[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (campaigns.length === 0) {
    return (
      <div className="analytics-empty">
        <p className="muted">Nenhuma campanha registrada.</p>
      </div>
    )
  }

  return (
    <div className="analytics-campaigns">
      <h4 className="analytics-chart-title">Campanhas recentes</h4>
      <div className="analytics-campaign-list">
        {campaigns.map((c) => {
          const isExpanded = expandedId === c.campaign_id
          const pct = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0

          return (
            <div key={c.campaign_id} className="analytics-campaign-item">
              <button
                type="button"
                className="analytics-campaign-header"
                onClick={() => setExpandedId(isExpanded ? null : c.campaign_id)}
              >
                <div className="analytics-campaign-main">
                  <span className="analytics-campaign-date">{formatDate(c.started_at)}</span>
                  <span className="analytics-campaign-stats">
                    {c.sent}/{c.total} · {c.failed} falha{c.failed !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="analytics-campaign-right">
                  <div className="analytics-campaign-bar">
                    <div
                      className="analytics-campaign-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`analytics-campaign-arrow ${isExpanded ? 'is-open' : ''}`}>
                    ▸
                  </span>
                </div>
              </button>
              {isExpanded && (
                <div className="analytics-campaign-detail">
                  <div className="analytics-campaign-detail-row">
                    <span>Campanha</span>
                    <span className="analytics-campaign-id">{c.campaign_id.slice(0, 8)}...</span>
                  </div>
                  <div className="analytics-campaign-detail-row">
                    <span>Perfil</span>
                    <span>{c.profile_wid || 'N/A'}</span>
                  </div>
                  {c.humanization_profile && (
                    <div className="analytics-campaign-detail-row">
                      <span>Perfil humaniz.</span>
                      <span>{c.humanization_profile}</span>
                    </div>
                  )}
                  <div className="analytics-campaign-detail-row">
                    <span>Progresso</span>
                    <span>{pct}% ({c.sent}/{c.total})</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ClearButton({ onClear }: { onClear: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (showConfirm) {
    return (
      <div className="analytics-clear-confirm">
        <span className="analytics-clear-text">Apagar todo o historico?</span>
        <div className="analytics-clear-actions">
          <button
            type="button"
            className="button button--small button--danger-outline"
            onClick={() => setShowConfirm(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => {
              onClear()
              setShowConfirm(false)
            }}
          >
            Sim, apagar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="button button--small button--danger-outline analytics-clear-btn"
      onClick={() => setShowConfirm(true)}
    >
      Limpar historico
    </button>
  )
}

export function AnalyticsDashboard({
  analytics,
  loading,
  onClear,
}: {
  analytics: AnalyticsResponse
  loading: boolean
  onClear: () => void
}) {
  if (loading) {
    return (
      <Card title="Historico de Prospeccoes">
        <div className="analytics-empty">
          <p className="muted">Carregando...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Historico de Prospeccoes">
      <div className="analytics-dashboard">
        <SummaryCards analytics={analytics} />
        <HourlyChart hourly={analytics.hourly} />
        <CampaignList campaigns={analytics.recent_campaigns} />
        <ClearButton onClear={onClear} />
      </div>
    </Card>
  )
}
