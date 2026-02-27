export type ExtensionSettings = {
  enabled: boolean
  workspaceName: string
}

export const defaultSettings: ExtensionSettings = {
  enabled: true,
  workspaceName: 'Minha Workspace',
}
