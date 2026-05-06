import { SettingsForm, useExtensionSettings } from '@/features'
import { Card } from '@/ui'

export function OptionsPage() {
  const { settings, isLoading, updateSettings } = useExtensionSettings()

  if (isLoading) {
    return (
      <main className="page">
        <Card title="Configurações" className="surface-card">
          <p className="muted">Carregando configurações...</p>
        </Card>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="stack options-layout">
        <Card title="Painel da Extensão" className="surface-card">
          <p className="muted">As preferências usam a mesma linguagem visual do popup.</p>
        </Card>

        <Card title="Preferências" className="surface-card">
          <SettingsForm initialSettings={settings} onSave={updateSettings} />
        </Card>
      </div>
    </main>
  )
}
