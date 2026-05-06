import { useState, useEffect, useCallback } from 'react'
import { BulkSendForm, useWppStatus } from '@/features'
import { Card, Tabs, type TabItem } from '@/ui'

declare const EXT_VERSION: string

interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  downloadUrl: string | null
  changelog: string | null
  publishedAt: string | null
  checkedAt: string
  error?: string
}

const TABS: TabItem[] = [
  { id: 'bulk', label: 'Envio em Massa' },
  { id: 'updates', label: 'Atualizações' },
  { id: 'about', label: 'Sobre' },
]

export function PopupPage() {
  const [activeTab, setActiveTab] = useState('bulk')
  const { status: wppStatus } = useWppStatus()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const loadUpdateInfo = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_GET_INFO' }, (response) => {
      if (response) {
        setUpdateInfo(response)
      }
    })
  }, [])

  const checkForUpdates = useCallback(() => {
    setCheckingUpdate(true)
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_CHECK_NOW' }, (response) => {
      if (response) {
        setUpdateInfo(response)
      }
      setCheckingUpdate(false)
    })
  }, [])

  useEffect(() => {
    loadUpdateInfo()
  }, [loadUpdateInfo])

  const handleDownload = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_DOWNLOAD' }, () => {})
  }, [])

  const handleViewRelease = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_VIEW_RELEASE' }, () => {})
  }, [])

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
            <Card title="Atualizações">
              <div className="updates-content">
                <dl className="update-info">
                  <div className="update-info-row">
                    <dt className="update-label">Versão atual:</dt>
                    <dd className="update-value">v{updateInfo?.currentVersion ?? EXT_VERSION}</dd>
                  </div>
                  {updateInfo?.checkedAt && (
                    <div className="update-info-row">
                      <dt className="update-label">Última verificação:</dt>
                      <dd className="update-value">
                        {new Date(updateInfo.checkedAt).toLocaleString('pt-BR')}
                      </dd>
                    </div>
                  )}
                </dl>

                <button
                  className="update-btn check"
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                >
                  {checkingUpdate ? 'Verificando...' : 'Verificar agora'}
                </button>

                {updateInfo?.error && (
                  <p className="update-error" role="alert">{updateInfo.error}</p>
                )}

                {updateInfo?.available && (
                  <div className="update-notice" role="alert" aria-label="Atualização disponível">
                    <h3 className="update-version">Nova versão: v{updateInfo.latestVersion}</h3>
                    {updateInfo.changelog ? (
                      <details className="update-changelog">
                        <summary className="muted">Changelog</summary>
                        <div className="changelog-text">{updateInfo.changelog}</div>
                      </details>
                    ) : (
                      <p className="muted">Nenhuma informação disponível.</p>
                    )}
                    <div className="update-actions" role="group" aria-label="Ações de atualização">
                      {updateInfo.downloadUrl ? (
                        <button className="update-btn download" onClick={handleDownload}>
                          Baixar atualização
                        </button>
                      ) : (
                        <button className="update-btn view" onClick={handleViewRelease}>
                          Ver release
                        </button>
                      )}
                      <button className="update-btn view" onClick={handleViewRelease}>
                        Ver no GitHub
                      </button>
                    </div>
                  </div>
                )}

                {!updateInfo?.available && !updateInfo?.error && updateInfo?.checkedAt && (
                  <p className="update-no-updates">✓ Extensão está atualizada.</p>
                )}
              </div>
            </Card>
          </section>
        )}

      </div>
    </main>
  )
}
