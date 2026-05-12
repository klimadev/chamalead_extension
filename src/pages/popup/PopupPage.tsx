import { useState, useEffect } from 'react'
import { BulkSendForm, InstagramProfileDetails, useActiveSiteContext, useInstagramProfile, useWppStatus, type SiteFeatureTabId } from '@/features'
import { Card, Tabs, type TabItem } from '@/ui'
import { UpdatesTab } from './UpdatesTab'

declare const EXT_VERSION: string

const GLOBAL_TABS: TabItem[] = [
  { id: 'updates', label: 'Atualizacoes' },
  { id: 'about', label: 'Sobre' },
]

const SITE_TAB_ITEMS: Record<SiteFeatureTabId, TabItem> = {
  bulk: { id: 'bulk', label: 'Envio em Massa' },
  'profile-details': { id: 'profile-details', label: 'Perfil' },
}

function openWhatsAppWeb() {
  void chrome.tabs.create({ url: 'https://web.whatsapp.com' })
}

function SiteContextBadge({ siteLabel, statusChip }: { siteLabel: string; statusChip: { text: string; variant: string } }) {
  return (
    <div className="site-context-badge">
      <span className="site-context-badge-label">{siteLabel}</span>
      <span className={`status-chip status-chip--${statusChip.variant}`}>{statusChip.text}</span>
    </div>
  )
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
          <li>Envio em massa via CSV</li>
          <li>Audio em massa (PTT)</li>
          <li>Variaveis personalizadas</li>
          <li>Intervalos inteligentes</li>
        </ul>
        <button type="button" className="button open-whatsapp-btn" onClick={onDismiss}>
          Abrir WhatsApp Web
        </button>
      </div>
    </Card>
  )
}

function WhatsAppStatusPanel({ wppStatus }: { wppStatus: ReturnType<typeof useWppStatus>['status'] }) {
  if (wppStatus.isLoading) {
    return (
      <div className="status-panel-header">
        <div>
          <h3 className="status-panel-title">Verificando WhatsApp...</h3>
          <p className="status-panel-description">Checando conexao e login.</p>
        </div>
        <div className="status-chip status-chip--neutral">Verificando</div>
      </div>
    )
  }

  if (wppStatus.isReady && wppStatus.isAuthenticated) {
    return (
      <div className="status-panel-header">
        <div>
          <h3 className="status-panel-title">Pronto pra disparar</h3>
          <p className="status-panel-description">Tudo pronto para comecar.</p>
        </div>
        <div className="status-chip status-chip--success">Pronto</div>
      </div>
    )
  }

  if (wppStatus.isReady && !wppStatus.isAuthenticated) {
    return (
      <div className="status-panel-header">
        <div>
          <h3 className="status-panel-title">Faca login no WhatsApp</h3>
          <p className="status-panel-description">Abra o WhatsApp e faca login.</p>
        </div>
        <div className="status-chip status-chip--warning">Aguardando login</div>
      </div>
    )
  }

  return (
    <div className="status-panel-header">
      <div>
        <h3 className="status-panel-title">WhatsApp nao detectado</h3>
        <p className="status-panel-description">Abra o WhatsApp Web primeiro.</p>
      </div>
      <div className="status-chip status-chip--danger">Indisponivel</div>
    </div>
  )
}

function SiteUnavailableCard() {
  return (
    <div className="unavailable-content">
      <p className="muted">O ChamaLead funciona no WhatsApp e Instagram.</p>
      <button type="button" className="button open-whatsapp-btn" onClick={openWhatsAppWeb}>
        Abrir WhatsApp Web
      </button>
    </div>
  )
}

function SiteLoadingCard() {
  return (
    <div className="status-panel-header">
      <div>
        <h3 className="status-panel-title">Detectando site ativo</h3>
        <p className="status-panel-description">Aguarde enquanto a extensao identifica o site atual.</p>
      </div>
      <div className="status-chip status-chip--neutral">Carregando</div>
    </div>
  )
}

function WhatsAppBulkSection({ wppStatus }: { wppStatus: ReturnType<typeof useWppStatus>['status'] }) {
  return (
    <section aria-label="Envio em massa">
      <Card title="Envio em Massa">
        {wppStatus.isReady && wppStatus.isAuthenticated ? (
          <BulkSendForm />
        ) : (
          <p className="muted">
            Conecte-se ao WhatsApp primeiro para usar o envio em massa.
          </p>
        )}
      </Card>
    </section>
  )
}

function InstagramProfileSection({ profileState, onRetry }: { profileState: ReturnType<typeof useInstagramProfile>['profileState']; onRetry: ReturnType<typeof useInstagramProfile>['refresh'] }) {
  return <InstagramProfileDetails profileState={profileState} onRetry={onRetry} />
}

export function PopupPage() {
  const [activeTab, setActiveTab] = useState('bulk')
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const { siteContext } = useActiveSiteContext()
  const { status: wppStatus } = useWppStatus(siteContext.state === 'resolved' && siteContext.isSupported)
  const { profileState, refresh } = useInstagramProfile(siteContext.state === 'resolved' && siteContext.site?.id === 'instagram')

  useEffect(() => {
    chrome.storage.local.get('chamalead_onboarded', (result) => {
      if (!result.chamalead_onboarded) {
        setShowWelcome(true)
      }
      setWelcomeChecked(true)
    })
  }, [])

  const dismissWelcome = () => {
    chrome.storage.local.set({ chamalead_onboarded: true })
    setShowWelcome(false)
    openWhatsAppWeb()
  }

  const siteSpecificTabs = siteContext.site?.id === 'whatsapp'
    ? [SITE_TAB_ITEMS.bulk]
    : siteContext.site?.id === 'instagram'
      ? [SITE_TAB_ITEMS['profile-details']]
    : []

  const availableTabs = [...siteSpecificTabs, ...GLOBAL_TABS]
  const resolvedActiveTab = availableTabs.find((tab) => tab.id === activeTab)?.id ?? availableTabs[0]?.id ?? ''

  const wppChipVariant = wppStatus.isReady && wppStatus.isAuthenticated ? 'success' : wppStatus.isReady ? 'warning' : 'neutral'
  const wppChipText = wppStatus.isReady && wppStatus.isAuthenticated ? 'Pronto' : wppStatus.isReady ? 'Aguardando login' : 'Verificando'

  const siteBadge = siteContext.state === 'loading'
    ? { label: 'Detectando site...', chip: { text: 'Carregando', variant: 'neutral' } }
    : siteContext.site?.id === 'whatsapp'
      ? { label: 'WhatsApp Web', chip: { text: wppChipText, variant: wppChipVariant } }
      : siteContext.site?.id === 'instagram'
        ? { label: 'Instagram', chip: { text: 'Ativo', variant: 'success' } }
        : { label: siteContext.siteLabel, chip: { text: 'Outro site', variant: 'neutral' } }

  return (
    <main className="page" style={{ width: 380 }} role="main" aria-label="ChamaLead - Extensao site-aware">
      <div className="stack">
        <header className="popup-header">
          <div className="header-identity">
            <span className="header-brand">ChamaLead</span>
            <span className="header-version">v{EXT_VERSION}</span>
          </div>

          <Card className="site-status-card">
            <section className="status-panel" aria-label="Contexto do site">
              <SiteContextBadge siteLabel={siteBadge.label} statusChip={siteBadge.chip} />

              {siteContext.state === 'loading' ? (
                <SiteLoadingCard />
              ) : siteContext.site?.id === 'whatsapp' ? (
                <WhatsAppStatusPanel wppStatus={wppStatus} />
              ) : siteContext.site?.id === 'instagram' ? (
                <div className="status-panel-header">
                  <div>
                    <h3 className="status-panel-title">Perfil disponivel</h3>
                    <p className="status-panel-description">A extensao pode ler o perfil aberto agora.</p>
                  </div>
                </div>
              ) : (
                <SiteUnavailableCard />
              )}
            </section>
          </Card>
        </header>

        {showWelcome && <WelcomeCard onDismiss={dismissWelcome} />}

        {welcomeChecked && !showWelcome && (
          <>
        <nav aria-label="Navegacao principal">
          <Tabs tabs={availableTabs} activeTab={resolvedActiveTab} onTabChange={setActiveTab} />
        </nav>

        {resolvedActiveTab === 'bulk' && siteContext.isSupported && <WhatsAppBulkSection wppStatus={wppStatus} />}

        {resolvedActiveTab === 'profile-details' && siteContext.site?.id === 'instagram' && (
          <InstagramProfileSection profileState={profileState} onRetry={refresh} />
        )}

        {resolvedActiveTab === 'about' && (
          <section aria-label="Sobre o ChamaLead">
            <Card title="Sobre" className="about-card">
              <div className="about-content">
                <div className="about-identity">
                  <div className="about-logo">CL</div>
                  <div>
                    <p className="section-kicker">Identidade do produto</p>
                    <h3 className="about-name">ChamaLead</h3>
                    <p className="about-version">Versao {EXT_VERSION}</p>
                  </div>
                </div>
                <p className="about-description">Extensao site-aware para WhatsApp Web e Instagram, com foco em operacoes rapidas no popup.</p>
                <div className="about-grid">
                  <div className="about-block">
                    <h4>Capacidades</h4>
                    <ul>
                      <li>Envio em massa via CSV</li>
                      <li>Audio massivo (PTT)</li>
                      <li>Perfil do Instagram</li>
                      <li>Intervalos humanizados</li>
                      <li>Pausa, retomada e cancelamento</li>
                      <li>Base preparada para features por site</li>
                    </ul>
                  </div>
                  <div className="about-block">
                    <h4>Contexto</h4>
                    <ul>
                      <li>Popup operacional com contexto do site ativo</li>
                      <li>Atualizacoes via GitHub Release</li>
                      <li>Persistencia local de preferencias</li>
                      <li>Compativel com Chrome Extension MV3</li>
                    </ul>
                  </div>
                </div>
                <footer className="about-footer">Desenvolvido para operacao pratica, clara e segura.</footer>
              </div>
            </Card>
          </section>
        )}

        {resolvedActiveTab === 'updates' && (
          <section aria-label="Atualizacoes">
            <UpdatesTab />
          </section>
        )}

        </>
        )}

      </div>
    </main>
  )
}
