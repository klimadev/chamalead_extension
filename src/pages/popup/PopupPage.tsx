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

  return (
    <main className="page" style={{ width: 380 }} role="main" aria-label="ChamaLead - Extensão WhatsApp">
      <div className="stack">
        <header>
          <Card title={`ChamaLead v${EXT_VERSION}`}>
            <section className="wpp-status" aria-label="Status do WhatsApp">
              <dl className="status-list">
                <div className="status-row">
                  <dt className="status-label">Status WPP:</dt>
                  <dd className={`status-badge ${wppStatus.isReady ? 'ready' : 'not-ready'}`}>
                    {wppStatus.isReady ? 'Pronto' : 'Aguardando...'}
                  </dd>
                </div>
                {wppStatus.isReady && (
                  <div className="status-row">
                    <dt className="status-label">Autenticado:</dt>
                    <dd
                      className={`status-badge ${wppStatus.isAuthenticated ? 'authenticated' : 'not-authenticated'}`}
                    >
                      {wppStatus.isAuthenticated ? 'Sim' : 'Não'}
                    </dd>
                  </div>
                )}
              </dl>
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
            <Card title="Sobre">
              <div className="about-content">
                <div className="about-logo">CL</div>
                <h2>ChamaLead</h2>
                <p className="about-version">Versão {EXT_VERSION}</p>
                <p className="about-description">
                  Extensão WhatsApp para automação de mensagens e envio em massa.
                </p>
                <div className="about-features">
                  <h3>Recursos</h3>
                  <ul>
                    <li>Envio em massa via CSV</li>
                    <li>Áudio massivo (PTT)</li>
                    <li>Humanizado com intervalos</li>
                    <li>Modo pausa/retomada</li>
                  </ul>
                </div>
                <div className="about-tech">
                  <h3>Tecnologias</h3>
                  <ul>
                    <li>React 19 + TypeScript</li>
                    <li>WPPConnect WA-JS</li>
                    <li>Chrome Extension MV3</li>
                  </ul>
                </div>
                <footer className="about-footer">
                  Desenvolvido com ❤ para automação WhatsApp
                </footer>
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
