import { useState, useEffect, useCallback, useRef } from 'react'
import { CampaignWizard, GroupContactExtraction, useWppStatus, useActiveSiteContext, useInstagramProfile, InstagramProfileDetails, useAnalytics, AnalyticsDashboard } from '@/features'
import { Card } from '@/ui'
import { UpdatesTab } from './UpdatesTab'

declare const EXT_VERSION: string

type AppView = 'home' | 'campaign' | 'about' | 'updates' | 'group-extraction' | 'historic'

interface CampaignSummary {
  total: number
  sent: number
  failed: number
  status: string
  nextSendAt?: number
}

function openWhatsAppWeb() {
  void chrome.tabs.create({ url: 'https://web.whatsapp.com' })
}

function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="welcome-card">
      <div className="welcome-content">
        <div className="welcome-icon">CL</div>
        <h2 className="welcome-title">Bem-vindo ao ChamaLead</h2>
        <p className="welcome-description">
          Transforme seu WhatsApp em uma central de campanhas.
        </p>
        <ul className="welcome-features">
          <li>📝 Envio em massa via CSV</li>
          <li>🎤 Audio em massa (PTT)</li>
          <li>🔤 Variaveis personalizadas</li>
          <li>⏱️ Intervalos inteligentes</li>
        </ul>
        <button type="button" className="button open-whatsapp-btn" onClick={onDismiss}>
          Abrir WhatsApp Web
        </button>
      </div>
    </Card>
  )
}

function SiteUnsupported({ onOpenWhatsApp }: { onOpenWhatsApp: () => void }) {
  return (
    <main className="wizard-page" role="main">
      <div className="wizard">
        <div className="wizard-status-section wizard-status-section--neutral">
          <div className="wizard-status-icon">🌐</div>
          <h2 className="wizard-status-title">Site nao suportado</h2>
          <p className="muted">O ChamaLead funciona no WhatsApp e Instagram.</p>
        </div>
        <div className="wizard-actions">
          <button type="button" className="button" onClick={onOpenWhatsApp}>
            Abrir WhatsApp Web
          </button>
        </div>
      </div>
    </main>
  )
}

function HomeDashboard({ siteLabel, statusChip, wppReady, onStartCampaign, onViewAbout, onViewUpdates, onViewExtraction, onViewHistoric, campaignSummary }: {
  siteLabel: string
  statusChip: { text: string; variant: string }
  wppReady: boolean
  onStartCampaign: () => void
  onViewAbout: () => void
  onViewUpdates: () => void
  onViewExtraction: () => void
  onViewHistoric: () => void
  campaignSummary: CampaignSummary | null
}) {
  const percent = campaignSummary && campaignSummary.total > 0
    ? Math.round(((campaignSummary.sent + campaignSummary.failed) / campaignSummary.total) * 100)
    : 0
  const remainder = campaignSummary ? campaignSummary.total - campaignSummary.sent - campaignSummary.failed : 0

  const [homeCountdown, setHomeCountdown] = useState('')

  useEffect(() => {
    if (!campaignSummary?.nextSendAt || campaignSummary.status !== 'sending') return
    const id = setInterval(() => {
      const remaining = campaignSummary.nextSendAt! - Date.now()
      if (remaining <= 0) {
        setHomeCountdown('')
      } else {
        const mins = Math.floor(remaining / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setHomeCountdown(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [campaignSummary?.nextSendAt, campaignSummary?.status])

  return (
    <main className="page" role="main" aria-label="ChamaLead">
      <div className="stack">
        <header className="popup-header">
          <div className="header-identity">
            <span className="header-brand">🔶 ChamaLead</span>
            <span className="header-version">v{EXT_VERSION}</span>
          </div>
          <div className="site-status-bar">
            <span className="site-status-bar-label">{siteLabel}</span>
            <span className={`status-chip status-chip--${statusChip.variant}`}>{statusChip.text}</span>
          </div>
        </header>

        {campaignSummary && (
          <Card className="hero-card">
            <div className="hero-content">
              <div className="hero-icon">📊</div>
              <h2 className="hero-title">Campanha em andamento</h2>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#374151', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: campaignSummary.status === 'paused' ? '#F59E0B' : '#3B82F6', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              <p className="hero-description" style={{ marginTop: 8 }}>
                {campaignSummary.sent}/{campaignSummary.total} enviados · {campaignSummary.failed} falhas · {remainder} restantes
              </p>
              {homeCountdown && (
                <p className="hero-description" style={{ marginTop: 4, color: '#FBBF24', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  Proxima mensagem em {homeCountdown}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="button hero-cta" onClick={onStartCampaign}>
                  👁️ Ver campanha
                </button>
                {campaignSummary.status === 'paused' && (
                  <button type="button" className="button hero-cta" onClick={onStartCampaign} style={{ background: '#F59E0B' }}>
                    ▶ Retomar
                  </button>
                )}
              </div>
            </div>
          </Card>
        )}

        {!campaignSummary && (
          <Card className="hero-card">
            <div className="hero-content">
              <div className="hero-icon">⚡</div>
              <h2 className="hero-title">Nova Campanha</h2>
              <p className="hero-description">
                Importe CSV, escreva a mensagem e dispare em massa com seguranca.
              </p>
              <ul className="hero-features">
                <li>📝 Envio massivo de texto</li>
                <li>🎤 Audio PTT em massa</li>
                <li>🔤 Variaveis por contato</li>
                <li>🐢 Envio humanizado</li>
              </ul>
              <button
                type="button"
                className="button hero-cta"
                onClick={onStartCampaign}
                disabled={!wppReady}
              >
                {wppReady ? '🚀 Criar campanha' : '🔒 Conecte ao WhatsApp'}
              </button>
            </div>
          </Card>
        )}

        <nav className="home-footer" aria-label="Links">
          <button type="button" className="home-footer-link" onClick={onViewExtraction}>
            📊 Extrair Contatos
          </button>
          <button type="button" className="home-footer-link" onClick={onViewHistoric}>
            📈 Historico
          </button>
          <button type="button" className="home-footer-link" onClick={onViewUpdates}>
            📜 Atualizacoes
          </button>
          <button type="button" className="home-footer-link" onClick={onViewAbout}>
            ℹ️ Sobre
          </button>
        </nav>
      </div>
    </main>
  )
}

function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <main className="wizard-page" role="main">
      <div className="wizard">
        <div className="wizard-header">
          <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
        </div>
        <Card title="Sobre">
          <div className="about-content">
            <div className="about-identity">
              <div className="about-logo">CL</div>
              <div>
                <p className="section-kicker">Produto</p>
                <h3 className="about-name">ChamaLead</h3>
                <p className="about-version">Versao {EXT_VERSION}</p>
              </div>
            </div>
            <p className="about-description">Extensao site-aware para WhatsApp Web e Instagram.</p>
            <div className="about-grid">
              <div className="about-block">
                <h4>Capacidades</h4>
                <ul>
                  <li>Envio em massa via CSV</li>
                  <li>Audio massivo (PTT)</li>
                  <li>Perfil do Instagram</li>
                  <li>Intervalos humanizados</li>
                  <li>Pausa, retomada e cancelamento</li>
                </ul>
              </div>
              <div className="about-block">
                <h4>Contexto</h4>
                <ul>
                  <li>Popup operacional</li>
                  <li>Atualizacoes via GitHub</li>
                  <li>Persistencia local</li>
                  <li>Compativel MV3</li>
                </ul>
              </div>
            </div>
            <footer className="about-footer">Desenvolvido para operacao pratica, clara e segura.</footer>
          </div>
        </Card>
      </div>
    </main>
  )
}

function UpdatesView({ onBack }: { onBack: () => void }) {
  return (
    <main className="wizard-page" role="main">
      <div className="wizard">
        <div className="wizard-header">
          <button type="button" className="wizard-back-btn" onClick={onBack}>← Voltar</button>
        </div>
        <UpdatesTab />
      </div>
    </main>
  )
}

export function PopupPage() {
  const [view, setView] = useState<AppView>('home')
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary | null>(null)
  const campaignPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { siteContext } = useActiveSiteContext()
  const { status: wppStatus } = useWppStatus(siteContext.state === 'resolved' && siteContext.isSupported)
  const { profileState, refresh } = useInstagramProfile(siteContext.state === 'resolved' && siteContext.site?.id === 'instagram')
  const campaignActive = campaignSummary !== null && (campaignSummary.status === 'sending' || campaignSummary.status === 'paused')
  const { analytics, loading: analyticsLoading, clear: clearAnalytics } = useAnalytics(campaignActive)

  const fetchCampaignState = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_BULK_SEND_GET_STATE' }, (response) => {
      if (!response || response.status === 'idle') {
        setCampaignSummary(null)
        return
      }
      setCampaignSummary({
        total: response.total ?? 0,
        sent: response.sent ?? 0,
        failed: response.failed ?? 0,
        status: response.status ?? 'idle',
        nextSendAt: typeof response.nextSendAt === 'number' ? response.nextSendAt : undefined,
      })
    })
  }, [])

  useEffect(() => {
    fetchCampaignState()
  }, [fetchCampaignState])

  useEffect(() => {
    if (view !== 'campaign' && campaignSummary && (campaignSummary.status === 'sending' || campaignSummary.status === 'paused')) {
      campaignPollRef.current = setInterval(fetchCampaignState, 5000)
    }
    return () => {
      if (campaignPollRef.current) {
        clearInterval(campaignPollRef.current)
        campaignPollRef.current = null
      }
    }
  }, [view, campaignSummary, fetchCampaignState])

  useEffect(() => {
    if (!campaignSummary || campaignSummary.status === 'completed' || campaignSummary.status === 'error') {
      if (campaignPollRef.current) {
        clearInterval(campaignPollRef.current)
        campaignPollRef.current = null
      }
    }
  }, [campaignSummary])

  useEffect(() => {
    chrome.storage.local.get('chamalead_onboarded', (result) => {
      if (!result.chamalead_onboarded) setShowWelcome(true)
      setWelcomeChecked(true)
    })
  }, [])

  const dismissWelcome = () => {
    chrome.storage.local.set({ chamalead_onboarded: true })
    setShowWelcome(false)
    openWhatsAppWeb()
  }

  if (!welcomeChecked) {
    return (
      <main className="page" role="main" style={{ width: 380 }}>
        <div className="stack">
          <header className="popup-header">
            <div className="header-identity">
              <span className="header-brand">🔶 ChamaLead</span>
              <span className="header-version">v{EXT_VERSION}</span>
            </div>
          </header>
          <Card title="Carregando...">
            <p className="muted">Inicializando a extensao.</p>
          </Card>
        </div>
      </main>
    )
  }

  if (showWelcome) {
    return (
      <main className="page" role="main" style={{ width: 380 }}>
        <div className="stack">
          <header className="popup-header">
            <div className="header-identity">
              <span className="header-brand">🔶 ChamaLead</span>
              <span className="header-version">v{EXT_VERSION}</span>
            </div>
          </header>
          <WelcomeCard onDismiss={dismissWelcome} />
        </div>
      </main>
    )
  }

  const wppReady = wppStatus.isReady && wppStatus.isAuthenticated
  const wppChipVariant = wppStatus.isReady && wppStatus.isAuthenticated ? 'success' : wppStatus.isReady ? 'warning' : 'neutral'
  const wppChipText = wppStatus.isReady && wppStatus.isAuthenticated ? 'Pronto' : wppStatus.isReady ? 'Aguardando login' : 'Verificando'

  const siteBadge = siteContext.state === 'loading'
    ? { label: 'Detectando site...', chip: { text: 'Carregando', variant: 'neutral' } }
    : siteContext.site?.id === 'whatsapp'
      ? { label: 'WhatsApp Web', chip: { text: wppChipText, variant: wppChipVariant } }
      : siteContext.site?.id === 'instagram'
        ? { label: 'Instagram', chip: { text: 'Ativo', variant: 'success' } }
        : { label: siteContext.siteLabel, chip: { text: 'Outro site', variant: 'neutral' } }

  if (siteContext.state === 'resolved' && !siteContext.isSupported) {
    if (view === 'campaign') {
      return <CampaignWizard onBack={() => setView('home')} wppStatus={wppStatus} />
    }
    return <SiteUnsupported onOpenWhatsApp={openWhatsAppWeb} />
  }

  if (view === 'campaign') {
    if (siteContext.site?.id === 'whatsapp') {
      return <CampaignWizard onBack={() => setView('home')} wppStatus={wppStatus} />
    }
    setView('home')
    return null
  }

  if (view === 'about') {
    return <AboutView onBack={() => setView('home')} />
  }

  if (view === 'updates') {
    return <UpdatesView onBack={() => setView('home')} />
  }

  if (view === 'group-extraction') {
    if (siteContext.site?.id === 'whatsapp') {
      return <GroupContactExtraction wppStatus={wppStatus} onBack={() => setView('home')} />
    }
    setView('home')
    return null
  }

  if (view === 'historic') {
    return (
      <main className="wizard-page" role="main">
        <div className="wizard">
          <div className="wizard-header">
            <button type="button" className="wizard-back-btn" onClick={() => setView('home')}>← Voltar</button>
          </div>
          <AnalyticsDashboard
            analytics={analytics}
            loading={analyticsLoading}
            onClear={clearAnalytics}
          />
        </div>
      </main>
    )
  }

  if (siteContext.site?.id === 'instagram') {
    return (
      <main className="page" role="main" style={{ width: 380 }}>
        <div className="stack">
          <header className="popup-header">
            <div className="header-identity">
              <span className="header-brand">🔶 ChamaLead</span>
              <span className="header-version">v{EXT_VERSION}</span>
            </div>
            <div className="site-status-bar">
              <span className="site-status-bar-label">{siteBadge.label}</span>
              <span className={`status-chip status-chip--${siteBadge.chip.variant}`}>{siteBadge.chip.text}</span>
            </div>
          </header>
          <InstagramProfileDetails profileState={profileState} onRetry={refresh} />
        </div>
      </main>
    )
  }

  return (
    <HomeDashboard
      siteLabel={siteBadge.label}
      statusChip={siteBadge.chip}
      wppReady={wppReady}
      onStartCampaign={() => setView('campaign')}
      onViewAbout={() => setView('about')}
      onViewUpdates={() => setView('updates')}
      onViewExtraction={() => setView('group-extraction')}
      onViewHistoric={() => setView('historic')}
      campaignSummary={campaignSummary}
    />
  )
}
