import { Card } from '../../components/ui/Card'
import { SettingsForm } from '../../features/settings/SettingsForm'
import { useExtensionSettings } from '../../shared/hooks/useExtensionSettings'

export function OptionsApp() {
  const { settings, isLoading, updateSettings } = useExtensionSettings()

  if (isLoading) {
    return (
      <main className="page">
        <p className="muted">Carregando configuracoes...</p>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="stack" style={{ maxWidth: 680, margin: '0 auto' }}>
        <Card title="Painel da Extensao">
          <p className="muted">Mesmo estado, mesmo formulario, outra superficie.</p>
        </Card>

        <Card title="Preferencias">
          <SettingsForm initialSettings={settings} onSave={updateSettings} />
        </Card>
      </div>
    </main>
  )
}
