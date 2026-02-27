import { useWppChats, useWppStatus } from '@/features'
import { Card } from '@/ui'

export function PopupPage() {
  const { status: wppStatus } = useWppStatus()
  const { chats, total, limitedTo } = useWppChats(wppStatus)

  return (
    <main className="page" style={{ width: 360 }}>
      <div className="stack">
        <Card title="ChamaLead">
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

        {wppStatus.isReady && wppStatus.isAuthenticated && (
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
      </div>
    </main>
  )
}
