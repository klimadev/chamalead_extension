import { useState, useEffect, useCallback } from 'react'
import { BulkSendForm, useWppChats, useWppStatus } from '@/features'
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
  { id: 'chats', label: 'Conversas' },
  { id: 'bulk', label: 'Envio em Massa' },
  { id: 'about', label: 'Sobre' },
]

export function PopupPage() {
  const [activeTab, setActiveTab] = useState('bulk')
  const { status: wppStatus } = useWppStatus()
  const { chats, total, limitedTo } = useWppChats(wppStatus)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  const loadUpdateInfo = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CHAMALEAD_UPDATE_GET_INFO' }, (response) => {
      if (response) {
        setUpdateInfo(response)
      }
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

  const renderUpdateNotice = () => {
    if (!updateInfo?.available) return null

    const changelogPreview = updateInfo.changelog
      ? updateInfo.changelog.length > 200
        ? `${updateInfo.changelog.substring(0, 200)}...`
        : updateInfo.changelog
      : 'Nenhuma informação disponível.'

    return (
      <aside className="update-notice" role="alert" aria-label="Atualização disponível">
        <Card title="Atualização Disponível">
          <div className="update-notice-content">
            <p className="update-version">Nova versão: v{updateInfo.latestVersion}</p>
            <p className="update-current">Versão atual: v{updateInfo.currentVersion}</p>
            <details className="update-changelog-preview">
              <summary className="muted">Changelog</summary>
              <p className="changelog-text">{changelogPreview}</p>
            </details>
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
        </Card>
      </aside>
    )
  }

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

        {renderUpdateNotice()}

        <nav aria-label="Navegação principal">
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </nav>

        {activeTab === 'chats' && (
          <section aria-label="Lista de conversas">
            <Card title="Conversas">
              <div className="contacts-panel">
                {chats.length === 0 && total === 0 ? (
                  <p className="muted" role="status">Carregando conversas...</p>
                ) : chats.length === 0 ? (
                  <p className="muted" role="status">Nenhuma conversa disponível.</p>
                ) : (
                  <>
                    <p className="muted contacts-meta">
                      {total > limitedTo ? `+ de ${limitedTo}` : total} conversas
                    </p>
                    <ul className="contacts-list" role="list">
                      {chats.map((chat) => {
                        const displayName = chat.name || chat.id

                        return (
                          <li key={chat.id} className="contact-item">
                            <div className="contact-name-row">
                              <strong className="contact-name">{displayName}</strong>
                              {chat.isGroup && <span className="contact-tag" role="status">Grupo</span>}
                              {chat.isNewsletter && <span className="contact-tag" role="status">Newsletter</span>}
                              {chat.unreadCount > 0 && (
                                <span className="contact-unread" aria-label={`${chat.unreadCount} mensagens não lidas`}>
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <span className="contact-last-message">{chat.lastMessage}</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </div>
            </Card>
          </section>
        )}

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


      </div>
    </main>
  )
}
