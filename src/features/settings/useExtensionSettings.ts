import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from './storage'
import { defaultSettings, type ExtensionSettings } from './settings'

export function useExtensionSettings() {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const loaded = await getSettings()
      setSettings(loaded)
      setIsLoading(false)
    })()
  }, [])

  const updateSettings = async (nextSettings: ExtensionSettings): Promise<void> => {
    setSettings(nextSettings)
    await saveSettings(nextSettings)
  }

  return { settings, isLoading, updateSettings }
}
