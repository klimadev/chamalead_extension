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
    <div className="stack">
      <div className="row">
        <span>Extensao ativa</span>
        <Switch
          checked={draft.enabled}
          onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
        />
      </div>

      <label className="stack">
        <span>Workspace</span>
        <input
          value={draft.workspaceName}
          onChange={(event) =>
            setDraft((current) => ({ ...current, workspaceName: event.target.value }))
          }
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        />
      </label>

      <Button onClick={() => void handleSave()} disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
