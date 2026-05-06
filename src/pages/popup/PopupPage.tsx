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
      <Card title="Atualização Disponível">
        <div className="update-notice">
          <p className="update-version">Nova versão: v{updateInfo.latestVersion}</p>
          <p className="update-current">Versão atual: v{updateInfo.currentVersion}</p>
          <div className="update-changelog-preview">
            <p className="muted">Changelog:</p>
            <p className="changelog-text">{changelogPreview}</p>
          </div>
          <div className="update-actions">
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
    )
  }

  return (
    <main className="page" style={{ width: 380 }}>
      <div className="stack">
        <Card title={`ChamaLead v${EXT_VERSION}`}>
          <div className="wpp-status">
            <div className="status-row">
              <span className="status-label">Status WPP:</span>
              <span className={`status-badge ${wppStatus.isReady ? 'ready' : 'not-ready'}`}>
                {wppStatus.isReady ? 'Pronto' : 'Aguardando...'}
              </span>
            </div>
            {wppStatus.isReady && (
              <div className="status-row">
                <span className="status-label">Autenticado:</span>
                <span
                  className={`status-badge ${wppStatus.isAuthenticated ? 'authenticated' : 'not-authenticated'}`}
                >
                  {wppStatus.isAuthenticated ? 'Sim' : 'Nao'}
                </span>
              </div>
            )}
          </div>
        </Card>

        {renderUpdateNotice()}

        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'chats' && (
          <Card title="Conversas">
            <div className="contacts-panel">
              {chats.length === 0 && total === 0 ? (
                <p className="muted">Carregando conversas...</p>
              ) : chats.length === 0 ? (
                <p className="muted">Nenhuma conversa disponivel.</p>
              ) : (
                <>
                  <p className="muted contacts-meta">
                    {total > limitedTo ? `+ de ${limitedTo}` : total} conversas
                  </p>
                  <ul className="contacts-list">
                    {chats.map((chat) => {
                      const displayName = chat.name || chat.id

                      return (
                        <li key={chat.id} className="contact-item">
                          <div className="contact-name-row">
                            <strong className="contact-name">{displayName}</strong>
                            {chat.isGroup && <span className="contact-tag">Grupo</span>}
                            {chat.isNewsletter && <span className="contact-tag">Newsletter</span>}
                            {chat.unreadCount > 0 && (
                              <span className="contact-unread">{chat.unreadCount}</span>
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
        )}

        {activeTab === 'bulk' && (
          <Card title="Envio em Massa">
            {wppStatus.isReady && wppStatus.isAuthenticated ? (
              <BulkSendForm />
            ) : (
              <p className="muted">
                Conecte-se ao WhatsApp primeiro para usar o envio em massa.
              </p>
            )}
          </Card>
        )}

        {activeTab === 'about' && (
          <Card title="Sobre">
            <div className="about-content">
              <div className="about-logo">CL</div>
              <h2>ChamaLead</h2>
              <p className="about-version">Versao {EXT_VERSION}</p>
              <p className="about-description">
                Extensao WhatsApp para automacao de mensagens e envio em massa.
              </p>
              <div className="about-features">
                <h3>Recursos</h3>
                <ul>
                  <li>Envio em massa via CSV</li>
                  <li>Audio massivo (PTT)</li>
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
              <p className="about-footer">
                Desenvolvido com ❤ para automacao WhatsApp
              </p>
            </div>
          </Card>
        )}


      </div>
    </main>
  )
}
