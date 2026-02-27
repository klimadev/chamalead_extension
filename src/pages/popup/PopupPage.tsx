import { SettingsForm, useExtensionSettings, useWppStatus } from '@/features'
import { Card } from '@/ui'

export function PopupPage() {
  const { settings, isLoading: isSettingsLoading, updateSettings } = useExtensionSettings()
  const { status: wppStatus } = useWppStatus()

  if (isSettingsLoading) {
    return (
      <main className="page">
        <p className="muted">Carregando...</p>
      </main>
    )
  }

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

        <Card title="Configuracoes">
          <SettingsForm initialSettings={settings} onSave={updateSettings} />
        </Card>
      </div>
    </main>
  )
}
