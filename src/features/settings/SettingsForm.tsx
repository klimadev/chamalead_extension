import { useState } from 'react'
import { Button, Switch } from '@/ui'
import { type ExtensionSettings } from './settings'

type SettingsFormProps = {
  initialSettings: ExtensionSettings
  onSave: (settings: ExtensionSettings) => Promise<void>
}

export function SettingsForm({ initialSettings, onSave }: SettingsFormProps) {
  const [draft, setDraft] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(draft)
    setIsSaving(false)
  }

  return (
    <div className="settings-form stack">
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="section-kicker">Estado do produto</p>
            <h3 className="section-title">Extensão ativa</h3>
          </div>
          <Switch
            checked={draft.enabled}
            onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
          />
        </div>
        <p className="section-helper">Quando desativada, a extensão mantém as preferências mas para a operação.</p>
      </div>

      <label className="field-stack">
        <span className="field-label">Workspace</span>
        <input
          className="field-input"
          value={draft.workspaceName}
          onChange={(event) =>
            setDraft((current) => ({ ...current, workspaceName: event.target.value }))
          }
        />
        <span className="field-hint">Nome usado para identificar a operação dentro da extensão.</span>
      </label>

      <Button onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
