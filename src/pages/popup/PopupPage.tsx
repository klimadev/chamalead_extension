import { useState } from 'react'
import { BulkSendForm, InstagramProfileDetails, useActiveSiteContext, useInstagramProfile, useWppStatus, type SiteFeatureTabId } from '@/features'
import { Card, Tabs, type TabItem } from '@/ui'
import { UpdatesTab } from './UpdatesTab'

declare const EXT_VERSION: string

const GLOBAL_TABS: TabItem[] = [
  { id: 'updates', label: 'Atualizações' },
  { id: 'about', label: 'Sobre' },
]

const SITE_TAB_ITEMS: Record<SiteFeatureTabId, TabItem> = {
  bulk: { id: 'bulk', label: 'Envio em Massa' },
  'profile-details': { id: 'profile-details', label: 'Perfil' },
}

function WhatsAppStatusPanel({ wppStatus }: { wppStatus: ReturnType<typeof useWppStatus>['status'] }) {
  const readinessLabel = wppStatus.isLoading
    ? 'Verificando WhatsApp'
    : wppStatus.isReady && wppStatus.isAuthenticated
      ? 'Pronto para enviar'
      : wppStatus.isReady
        ? 'Sessão aguardando autenticação'
        : 'WhatsApp indisponível'

  const readinessDescription = wppStatus.isLoading
    ? 'A extensão está checando a presença e o estado da sessão.'
    : wppStatus.isReady && wppStatus.isAuthenticated
      ? 'Envio em massa liberado com sessão autenticada.'
      : wppStatus.isReady
        ? 'O WhatsApp abriu, mas a sessão ainda não está autenticada.'
        : 'Conecte o WhatsApp Web antes de iniciar campanhas.'

  return (
    <section className="status-panel" aria-label="Status do WhatsApp">
      <div className="status-panel-header">
        <div>
          <p className="section-kicker">WhatsApp operacional</p>
          <h3 className="status-panel-title">{readinessLabel}</h3>
          <p className="status-panel-description">{readinessDescription}</p>
        </div>
        <div className={`status-chip status-chip--${wppStatus.isLoading ? 'neutral' : wppStatus.isReady && wppStatus.isAuthenticated ? 'success' : wppStatus.isReady ? 'warning' : 'danger'}`}>
          {wppStatus.isLoading ? 'Checando' : wppStatus.isReady && wppStatus.isAuthenticated ? 'Pronto' : wppStatus.isReady ? 'Parcial' : 'Bloqueado'}
        </div>
      </div>

      <div className="status-metrics" aria-label="Indicadores do WhatsApp">
        <span className={`status-chip ${wppStatus.isReady ? 'status-chip--success' : 'status-chip--warning'}`}>
          {wppStatus.isReady ? 'WPP conectado' : 'WPP ausente'}
        </span>
        <span className={`status-chip ${wppStatus.isAuthenticated ? 'status-chip--success' : 'status-chip--danger'}`}>
          {wppStatus.isAuthenticated ? 'Sessão autenticada' : 'Sessão não autenticada'}
        </span>
        {wppStatus.isLoading && <span className="status-chip status-chip--neutral">Atualizando estado</span>}
      </div>
    </section>
  )
}

function SiteUnavailableCard({ siteLabel, siteDescription }: { siteLabel: string; siteDescription: string }) {
  return (
    <section className="status-panel" aria-label="Site não suportado">
      <div className="status-panel-header">
        <div>
          <p className="section-kicker">Site atual</p>
          <h3 className="status-panel-title">{siteLabel}</h3>
          <p className="status-panel-description">{siteDescription}</p>
        </div>
        <div className="status-chip status-chip--neutral">Sem recursos</div>
      </div>

      <p className="muted">
        Atualizações e Sobre continuam disponíveis. Abra o WhatsApp Web para enviar mensagens.
      </p>
    </section>
  )
}

function SiteLoadingCard() {
  return (
    <section className="status-panel" aria-label="Detectando site">
      <div className="status-panel-header">
        <div>
          <p className="section-kicker">Contexto do site</p>
          <h3 className="status-panel-title">Detectando site ativo</h3>
          <p className="status-panel-description">Aguarde enquanto a extensão identifica o site atual.</p>
        </div>
        <div className="status-chip status-chip--neutral">Carregando</div>
      </div>

      <p className="muted">As abas globais continuam disponíveis enquanto o contexto é resolvido.</p>
    </section>
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
  const { siteContext } = useActiveSiteContext()
  const { status: wppStatus } = useWppStatus(siteContext.state === 'resolved' && siteContext.isSupported)
  const { profileState, refresh } = useInstagramProfile(siteContext.state === 'resolved' && siteContext.site?.id === 'instagram')

  const siteSpecificTabs = siteContext.site?.id === 'whatsapp'
    ? [SITE_TAB_ITEMS.bulk]
    : siteContext.site?.id === 'instagram'
      ? [SITE_TAB_ITEMS['profile-details']]
    : []

  const availableTabs = [...siteSpecificTabs, ...GLOBAL_TABS]
  const resolvedActiveTab = availableTabs.find((tab) => tab.id === activeTab)?.id ?? availableTabs[0]?.id ?? ''

  return (
    <main className="page" style={{ width: 380 }} role="main" aria-label="ChamaLead - Extensão site-aware">
      <div className="stack">
        <header>
          <Card title={`ChamaLead v${EXT_VERSION}`} className="status-card">
            {siteContext.state === 'loading' ? (
              <SiteLoadingCard />
            ) : siteContext.site?.id === 'whatsapp' ? (
              <WhatsAppStatusPanel wppStatus={wppStatus} />
            ) : siteContext.site?.id === 'instagram' ? (
              <section className="status-panel" aria-label="Instagram operacional">
                <div className="status-panel-header">
                  <div>
                    <p className="section-kicker">Instagram ativo</p>
                    <h3 className="status-panel-title">Perfil pronto</h3>
                    <p className="status-panel-description">A extensão pode ler o perfil aberto agora.</p>
                  </div>
                  <div className="status-chip status-chip--success">Ativo</div>
                </div>
              </section>
            ) : (
              <SiteUnavailableCard siteLabel={siteContext.siteLabel} siteDescription={siteContext.siteDescription} />
            )}
          </Card>
        </header>

        <nav aria-label="Navegação principal">
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
                    <p className="about-version">Versão {EXT_VERSION}</p>
                  </div>
                </div>
                <p className="about-description">Extensão site-aware para WhatsApp Web e Instagram, com foco em operações rápidas no popup.</p>
                <div className="about-grid">
                  <div className="about-block">
                    <h4>Capacidades</h4>
                    <ul>
                      <li>Envio em massa via CSV</li>
                      <li>Áudio massivo (PTT)</li>
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
                      <li>Atualizações via GitHub Release</li>
                      <li>Persistência local de preferências</li>
                      <li>Compatível com Chrome Extension MV3</li>
                    </ul>
                  </div>
                </div>
                <footer className="about-footer">Desenvolvido para operação prática, clara e segura.</footer>
              </div>
            </Card>
          </section>
        )}

        {resolvedActiveTab === 'updates' && (
          <section aria-label="Atualizações">
            <UpdatesTab />
          </section>
        )}

      </div>
    </main>
  )
}
