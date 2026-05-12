import { useState, useEffect } from 'react'
import { CampaignWizard, useWppStatus, useActiveSiteContext, useInstagramProfile, InstagramProfileDetails } from '@/features'
import { Card } from '@/ui'
import { UpdatesTab } from './UpdatesTab'

declare const EXT_VERSION: string

type AppView = 'home' | 'campaign' | 'about' | 'updates'

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

function HomeDashboard({ siteLabel, statusChip, wppReady, onStartCampaign, onViewAbout, onViewUpdates }: {
  siteLabel: string
  statusChip: { text: string; variant: string }
  wppReady: boolean
  onStartCampaign: () => void
  onViewAbout: () => void
  onViewUpdates: () => void
}) {
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
              <li>⏱️ 6-11s entre mensagens</li>
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

        <nav className="home-footer" aria-label="Links">
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
  const { siteContext } = useActiveSiteContext()
  const { status: wppStatus } = useWppStatus(siteContext.state === 'resolved' && siteContext.isSupported)
  const { profileState, refresh } = useInstagramProfile(siteContext.state === 'resolved' && siteContext.site?.id === 'instagram')

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
    />
  )
}
