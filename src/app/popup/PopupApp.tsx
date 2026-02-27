import { Card } from '../../components/ui/Card'
import { SettingsForm } from '../../features/settings/SettingsForm'
import { useExtensionSettings } from '../../shared/hooks/useExtensionSettings'

export function PopupApp() {
  const { settings, isLoading, updateSettings } = useExtensionSettings()

  if (isLoading) {
    return (
      <main className="page">
        <p className="muted">Carregando configuracoes...</p>
      </main>
    )
  }

  return (
    <main className="page" style={{ width: 360 }}>
      <div className="stack">
        <Card title="ChamaLead">
          <p className="muted">Base inicial para escalar sem gambiarra.</p>
        </Card>

        <Card title="Configuracoes">
          <SettingsForm initialSettings={settings} onSave={updateSettings} />
        </Card>
      </div>
    </main>
  )
}
