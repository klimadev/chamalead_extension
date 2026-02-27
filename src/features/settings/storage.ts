import browser from 'webextension-polyfill'
import { defaultSettings, type ExtensionSettings } from './settings'

const STORAGE_KEY = 'chamalead:settings'

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await browser.storage.sync.get(STORAGE_KEY)
  return {
    ...defaultSettings,
    ...(data[STORAGE_KEY] as Partial<ExtensionSettings> | undefined),
  }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: settings })
}
