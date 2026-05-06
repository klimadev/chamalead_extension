import { useState } from 'react'
import { BulkSendForm, useWppStatus } from '@/features'
import { Card, Tabs, type TabItem } from '@/ui'
import { UpdatesTab } from './UpdatesTab'

declare const EXT_VERSION: string

const TABS: TabItem[] = [
  { id: 'bulk', label: 'Envio em Massa' },
  { id: 'updates', label: 'Atualizações' },
  { id: 'about', label: 'Sobre' },
]

export function PopupPage() {
  const [activeTab, setActiveTab] = useState('bulk')
  const { status: wppStatus } = useWppStatus()

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
    <main className="page" style={{ width: 380 }} role="main" aria-label="ChamaLead - Extensão WhatsApp">
      <div className="stack">
        <header>
          <Card title={`ChamaLead v${EXT_VERSION}`} className="status-card">
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
          </Card>
        </header>

        <nav aria-label="Navegação principal">
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </nav>

        {activeTab === 'bulk' && (
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
        )}

        {activeTab === 'about' && (
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
                <p className="about-description">
                  Extensão para automação de WhatsApp focada em preparo de campanhas, envio em massa e atualização segura.
                </p>
                <div className="about-grid">
                  <div className="about-block">
                    <h4>Capacidades</h4>
                    <ul>
                      <li>Envio em massa via CSV</li>
                      <li>Áudio massivo (PTT)</li>
                      <li>Intervalos humanizados</li>
                      <li>Pausa, retomada e cancelamento</li>
                    </ul>
                  </div>
                  <div className="about-block">
                    <h4>Contexto</h4>
                    <ul>
                      <li>Popup operacional para campanhas</li>
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

        {activeTab === 'updates' && (
          <section aria-label="Atualizações">
            <UpdatesTab />
          </section>
        )}

      </div>
    </main>
  )
}
